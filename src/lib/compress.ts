export async function compressPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.size > 20000000)
    throw new Error("Pilih foto maksimum 20 MB.");
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "Format foto tidak didukung. Gunakan JPEG, PNG, atau WebP (ubah HEIC ke JPEG).",
    );
  }
  try {
    let size = Math.min(1, 1600 / Math.max(image.width, image.height));
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * size));
      canvas.height = Math.max(1, Math.round(image.height * size));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Tidak dapat memproses foto.");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(
          resolve,
          "image/webp",
          Math.max(0.5, 0.82 - attempt * 0.07),
        ),
      );
      if (blob && blob.type === "image/webp" && blob.size <= 500000)
        return blob;
      size *= 0.8;
    }
    throw new Error(
      "Foto belum dapat dikompres. Gunakan foto yang lebih kecil.",
    );
  } finally {
    image.close();
  }
}
