import { generateId } from '@/lib/utils'

const resizeImage = (
  file: File,
  maxWidth: number,
  maxHeight: number,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return reject(new Error('Could not get canvas context'))
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = reject
    }
    reader.onerror = reject
  })
}

export const uploadFileToCloud = async (
  file: File,
  onProgress: (progress: number) => void,
): Promise<string> => {
  let progress = 0
  const progressInterval = setInterval(() => {
    progress = Math.min(progress + 10, 90)
    onProgress(progress)
  }, 100)

  try {
    const resizedDataUrl = await resizeImage(file, 1280, 1280)
    clearInterval(progressInterval)
    onProgress(100)
    return resizedDataUrl
  } catch (error) {
    clearInterval(progressInterval)
    // Image processing failed - handled by error boundary
    throw new Error('Failed to process image before upload.')
  }
}
