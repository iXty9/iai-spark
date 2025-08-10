
export interface ParsedAttachment {
  name: string;
  mime: string;
  data: string; // base64 string without data: prefix
}

export const extractAttachmentsFromText = (
  msg: string
): { text: string; attachments: ParsedAttachment[] } => {
  const attachments: ParsedAttachment[] = [];
  if (!msg) return { text: msg, attachments };

  const regex = /\[attachment\s+name="([^"]+)"\s+mime="([^"]+)"\]\s*([\s\S]*?)\s*\[\/attachment\]/g;
  let clean = msg;

  clean = clean.replace(regex, (_match, name, mime, dataUrl) => {
    let base64 = (dataUrl || '').trim();
    let parsedMime = mime;

    if (base64.startsWith('data:')) {
      const commaIdx = base64.indexOf(',');
      if (commaIdx > -1) {
        const header = base64.substring(5, commaIdx); // after 'data:'
        const headerMime = header.split(';')[0];
        parsedMime = parsedMime || headerMime;
        base64 = base64.substring(commaIdx + 1);
      }
    }

    attachments.push({ name, mime: parsedMime || 'application/octet-stream', data: base64 });
    return '';
  });

  return { text: clean.trim(), attachments };
};

export const isImageMime = (mime: string) => mime.startsWith('image/');

export const toDataUrl = (att: ParsedAttachment) => `data:${att.mime};base64,${att.data}`;

export const downloadAttachment = (att: ParsedAttachment) => {
  const link = document.createElement('a');
  link.href = toDataUrl(att);
  link.download = att.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
