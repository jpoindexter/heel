// Adapted from Vanta desktop-app/src/clipboard-paste.ts; native decoding validates the actual file.
export function photoFiles(data: DataTransfer): File[] {
  const items = Array.from(data.items ?? []).filter(item => item.kind === "file").map(item => item.getAsFile()).filter((file): file is File => !!file);
  const seen = new Set<string>();
  return (items.length ? items : Array.from(data.files ?? [])).filter(file => {
    const key = [file.name, file.size, file.lastModified].join(":");
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function photoBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  return btoa(binary);
}
