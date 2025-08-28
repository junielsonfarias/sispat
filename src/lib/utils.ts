import { clsx, type ClassValue } from 'clsx';
import { format as formatDateFns, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;
}

export function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) {
    throw new Error('Invalid data URL');
  }
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export function formatCurrency(value: number) {
  if (isNaN(value) || value === null || value === undefined) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(
  date: Date | string | number,
  formatStr = 'dd/MM/yyyy'
) {
  return formatDateFns(new Date(date), formatStr, { locale: ptBR });
}

export function formatRelativeDate(date: Date | string | number) {
  return formatDistanceToNowStrict(new Date(date), {
    addSuffix: true,
    locale: ptBR,
  });
}

/**
 * Generates a document/image URL from a file ID.
 * @param fileId The file ID, potentially a data URL or stored file reference.
 * @returns A direct URL for accessing the file or a placeholder.
 */
export function getCloudImageUrl(fileId: string): string {
  if (typeof fileId !== 'string') {
    return '/placeholder.svg';
  }

  // Se for uma data URL, retorna diretamente
  if (fileId.startsWith('data:')) {
    return fileId;
  }

  // Se for uma URL HTTP completa, retorna diretamente
  if (fileId.startsWith('http')) {
    return fileId;
  }

  // Para arquivos armazenados localmente, usar endpoint do servidor
  if (fileId && fileId.length > 0) {
    return `/api/files/${fileId}`;
  }

  // Fallback para placeholder
  return '/placeholder.svg';
}
