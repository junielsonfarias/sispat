/**
 * cleanup-orphan-uploads — varre `uploads/` e remove arquivos sem
 * referência em nenhuma entidade do banco.
 *
 * Uso:
 *   ts-node backend/scripts/cleanup-orphan-uploads.ts            # dry-run, lista órfãos
 *   ts-node backend/scripts/cleanup-orphan-uploads.ts --delete   # remove de fato
 *   ts-node backend/scripts/cleanup-orphan-uploads.ts --older=30 # apenas arquivos > 30 dias
 *
 * Pode ser agendado em cron (semanal) para evitar acúmulo:
 *   0 3 * * 0 cd /var/www/sispat/backend && \
 *     node scripts/cleanup-orphan-uploads.js --delete --older=30 \
 *     >> /var/log/sispat-cleanup.log 2>&1
 *
 * Verifica referências em:
 *   Patrimonio.fotos[], Patrimonio.documentos[], Patrimonio.documentos_baixa[]
 *   Imovel.fotos[], Imovel.documentos[]
 *   Documento.url
 *   Customization.activeLogoUrl/secondaryLogoUrl/backgroundImageUrl/...
 *   Municipality.logoUrl
 *   User.avatar
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Args {
  doDelete: boolean;
  olderDays: number;
}

const parseArgs = (): Args => {
  const args = process.argv.slice(2);
  const doDelete = args.includes('--delete');
  const olderArg = args.find((a) => a.startsWith('--older='));
  const olderDays = olderArg ? parseInt(olderArg.split('=')[1], 10) : 0;
  return { doDelete, olderDays: isNaN(olderDays) ? 0 : olderDays };
};

const collectReferencedFilenames = async (): Promise<Set<string>> => {
  const refs = new Set<string>();

  const addUrl = (url: string | null | undefined) => {
    if (!url) return;
    const filename = path.basename(url);
    if (filename) refs.add(filename);
  };

  // Patrimônios
  const patrimonios = await prisma.patrimonio.findMany({
    select: { fotos: true, documentos: true, documentos_baixa: true },
  });
  patrimonios.forEach((p) => {
    p.fotos?.forEach(addUrl);
    p.documentos?.forEach(addUrl);
    p.documentos_baixa?.forEach(addUrl);
  });

  // Imóveis
  const imoveis = await prisma.imovel.findMany({
    select: { fotos: true, documentos: true },
  });
  imoveis.forEach((i) => {
    i.fotos?.forEach(addUrl);
    i.documentos?.forEach(addUrl);
  });

  // Documentos
  const documentos = await prisma.documento.findMany({ select: { url: true } });
  documentos.forEach((d) => addUrl(d.url));

  // Customizations (logos, favicon, backgrounds)
  const customizations = await prisma.customization.findMany({
    select: {
      activeLogoUrl: true,
      secondaryLogoUrl: true,
      backgroundImageUrl: true,
      backgroundVideoUrl: true,
      faviconUrl: true,
    },
  });
  customizations.forEach((c) => {
    addUrl(c.activeLogoUrl);
    addUrl(c.secondaryLogoUrl);
    addUrl(c.backgroundImageUrl);
    addUrl(c.backgroundVideoUrl);
    addUrl(c.faviconUrl);
  });

  // Municipality logos
  const munis = await prisma.municipality.findMany({ select: { logoUrl: true } });
  munis.forEach((m) => addUrl(m.logoUrl));

  // User avatars
  const users = await prisma.user.findMany({ select: { avatar: true } });
  users.forEach((u) => addUrl(u.avatar));

  return refs;
};

const main = async () => {
  const { doDelete, olderDays } = parseArgs();
  const uploadsDir = path.resolve(__dirname, '..', 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    console.error(`Pasta uploads não existe: ${uploadsDir}`);
    process.exit(1);
  }

  console.log(`📂 Varrendo: ${uploadsDir}`);
  console.log(`🧪 Modo: ${doDelete ? 'DELETE' : 'DRY-RUN'}`);
  if (olderDays > 0) console.log(`📅 Idade mínima: ${olderDays} dias`);

  const referenced = await collectReferencedFilenames();
  console.log(`🔗 ${referenced.size} arquivos referenciados no banco`);

  const allFiles = fs.readdirSync(uploadsDir).filter((f) => {
    const fullPath = path.join(uploadsDir, f);
    return fs.statSync(fullPath).isFile();
  });
  console.log(`💿 ${allFiles.length} arquivos no disco`);

  const cutoff = olderDays > 0 ? Date.now() - olderDays * 24 * 60 * 60 * 1000 : Infinity;

  const orphans: string[] = [];
  let totalSize = 0;
  for (const file of allFiles) {
    if (referenced.has(file)) continue;
    const fullPath = path.join(uploadsDir, file);
    const stat = fs.statSync(fullPath);
    if (stat.mtimeMs > cutoff) continue; // muito recente, pular
    orphans.push(file);
    totalSize += stat.size;
  }

  console.log(`🧹 Órfãos: ${orphans.length} arquivos (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

  if (orphans.length === 0) {
    console.log('✅ Nada a fazer.');
    await prisma.$disconnect();
    return;
  }

  // Sample para inspeção
  console.log('Primeiros 10 órfãos:');
  orphans.slice(0, 10).forEach((f) => console.log(`  - ${f}`));
  if (orphans.length > 10) console.log(`  ... e mais ${orphans.length - 10}`);

  if (!doDelete) {
    console.log('\n💡 Modo dry-run. Rode com --delete para remover.');
    await prisma.$disconnect();
    return;
  }

  let deleted = 0;
  let failed = 0;
  for (const file of orphans) {
    const fullPath = path.join(uploadsDir, file);
    try {
      fs.unlinkSync(fullPath);
      deleted++;
    } catch (err) {
      console.warn(`⚠️  Falha ao deletar ${file}:`, (err as Error).message);
      failed++;
    }
  }

  console.log(`✅ Deletados: ${deleted}. Falhas: ${failed}.`);
  await prisma.$disconnect();
};

main().catch(async (err) => {
  console.error('❌ Erro:', err);
  await prisma.$disconnect();
  process.exit(1);
});
