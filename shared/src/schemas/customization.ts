import { z } from 'zod';

// Customização visual da prefeitura (logo, cores, textos, vídeo de fundo).
// `model Customization` em `backend/prisma/schema.prisma`.
//
// A validação crítica de URL (isSafeUrl, Sprint 15) continua no
// `customizationController` — aqui só rejeitamos payloads grossos cedo
// (tipo errado, strings gigantes) antes do controller fazer o trabalho
// pesado.
//
// Mantemos compatibilidade total com `ALLOWED_FIELDS` do controller: se um
// campo extra vier no body, ele será silenciosamente descartado lá. Para
// não perder esse comportamento, NÃO usamos `.strict()` aqui.

// Colunas String? no Prisma → o GET devolve `null` para vazios; o contexto faz
// {...default, ...response} e reenvia no save. Aceitar null (.nullable) evita o
// 400 "Expected string, received null" que quebrava o save de customização.
const urlLikeSchema = z.string().max(1000).optional().nullable();
// Campos de IMAGEM aceitam data-URL base64 (os forms de logo/favicon/fundo enviam
// a imagem assim) — por isso o limite é generoso (cabe no body de 10mb do Express).
// IDEAL futuro: subir a imagem via fileService (/uploads/...) em vez de base64,
// evitando inflar a linha e o GET /customization/public. ~5M chars ≈ 3,7MB de imagem.
const imageUrlSchema = z.string().max(5_000_000).optional().nullable();
const shortColorSchema = z.string().max(50).optional().nullable();
const textShort = z.string().max(200).optional().nullable();
const textMedium = z.string().max(500).optional().nullable();
const textMicro = z.string().max(100).optional().nullable();
const textTiny = z.string().max(50).optional().nullable();

export const saveCustomizationSchema = z.object({
  activeLogoUrl: imageUrlSchema,
  secondaryLogoUrl: imageUrlSchema,
  backgroundImageUrl: imageUrlSchema,
  backgroundVideoUrl: urlLikeSchema,
  faviconUrl: imageUrlSchema,
  backgroundType: z.enum(['color', 'image', 'video']).optional(),
  backgroundColor: shortColorSchema,
  primaryColor: shortColorSchema,
  buttonTextColor: shortColorSchema,
  fontFamily: textMicro,
  layout: textTiny,
  welcomeTitle: textShort,
  welcomeSubtitle: textMedium,
  browserTitle: textShort,
  loginFooterText: textMedium,
  systemFooterText: textMedium,
  superUserFooterText: textMedium,
  prefeituraName: textShort,
  secretariaResponsavel: textShort,
  departamentoResponsavel: textShort,
  videoLoop: z.coerce.boolean().optional(),
  videoMuted: z.coerce.boolean().optional(),
});
export type SaveCustomizationInput = z.infer<typeof saveCustomizationSchema>;
