import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, ImageRun } from "docx";
import { saveAs } from "file-saver";
import { Member } from "./api";

const FONT_FAMILY = "Georgia";
const COLOR_NAVY = "002147";    // Deep Royal Navy
const COLOR_GOLD = "9A7B56";    // Premium Warm Gold Accent
const COLOR_CHARCOAL = "333333"; // Standard Body text
const COLOR_MUTED = "666666";    // Muted Subtitles & Details

const LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <path d="M148,25 C125,58 90,125 70,195 C52,258 46,315 58,345 C68,370 88,360 102,330 C135,260 168,165 185,98 C192,72 178,45 148,25 Z" fill="#2CB0E1" />
  <path d="M85,385 C145,355 220,310 285,245 C328,202 365,150 380,95 C382,90 376,85 370,90 C345,110 318,118 288,110 C255,102 232,82 205,95 C182,106 160,135 130,170 C100,205 82,248 76,288 C72,310 84,315 95,295 C118,255 145,218 175,190 C190,176 205,162 220,150 C228,144 235,150 231,158 C212,194 184,236 152,280 C120,324 98,362 85,385 Z" fill="#014A75" />
</svg>
`;

const svgToPng = (svgString: string, width: number, height: number): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("svgToPng can only run in a browser environment"));
      return;
    }
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 4; // High-res 4x scale for print quality (1600x1600 px)
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get 2D context"));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob failed"));
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to read as ArrayBuffer"));
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
};

export const generateBaptismalCertificate = async (member: Member) => {
  const name = `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Member Name";
  const baptismDate = member.baptismDate 
    ? new Date(member.baptismDate).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) 
    : "_______________";
  const birthDay = member.birthday
    ? new Date(member.birthday).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })
    : undefined;

  let logoBuffer: ArrayBuffer | null = null;
  try {
    logoBuffer = await svgToPng(LOGO_SVG, 400, 400);
  } catch (err) {
    console.error("Failed to generate logo PNG buffer:", err);
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          ...(logoBuffer ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 150 },
              children: [
                new ImageRun({
                  data: logoBuffer,
                  transformation: {
                    width: 70,
                    height: 70,
                  },
                }),
              ],
            })
          ] : []),

          // Header Accent / Space
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: logoBuffer ? 100 : 200, after: 100 },
            children: [
              new TextRun({
                text: "SUBIC CHURCH OF CHRIST",
                font: FONT_FAMILY,
                bold: true,
                size: 20, // 10pt
                color: COLOR_NAVY,
              }),
            ],
          }),

          // Small Elegant Ornament Divider
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "❖   ✧   ❖",
                font: FONT_FAMILY,
                size: 16,
                color: COLOR_GOLD,
              }),
            ],
          }),

          // Main Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: "Certificate of Baptism",
                font: FONT_FAMILY,
                bold: true,
                size: 56, // 28pt
                color: COLOR_NAVY,
              }),
            ],
          }),

          // Epigraph / Introductory Scriptural Verse
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 500 },
            children: [
              new TextRun({
                text: "“Go therefore and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit.”",
                font: FONT_FAMILY,
                italics: true,
                size: 16, // 8pt
                color: COLOR_MUTED,
              }),
              new TextRun({
                text: "\n— Matthew 28:19",
                font: FONT_FAMILY,
                size: 14, // 7pt
                color: COLOR_GOLD,
                bold: true,
              }),
            ],
          }),

          // Certifying Statement
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: "This certifies that",
                font: FONT_FAMILY,
                italics: true,
                size: 22, // 11pt
                color: COLOR_CHARCOAL,
              }),
            ],
          }),

          // Full Name of Member
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: name.toUpperCase(),
                font: FONT_FAMILY,
                bold: true,
                size: 44, // 22pt
                color: COLOR_NAVY,
                underline: {
                  type: "single",
                  color: COLOR_GOLD,
                },
              }),
            ],
          }),

          // birth date if present, or general declaration
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 250 },
            children: [
              new TextRun({
                text: birthDay ? `born into this world on ${birthDay}` : "having declared faith in our Lord and Savior Jesus Christ,",
                font: FONT_FAMILY,
                size: 20, // 10pt
                color: COLOR_CHARCOAL,
              }),
            ],
          }),

          // Baptism Statement
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 250 },
            children: [
              new TextRun({
                text: "was solemnly baptized in obedience to His eternal command,",
                font: FONT_FAMILY,
                italics: true,
                size: 20, // 10pt
                color: COLOR_CHARCOAL,
              }),
            ],
          }),

          // On the date
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: "on the day of ",
                font: FONT_FAMILY,
                size: 20, // 10pt
                color: COLOR_CHARCOAL,
              }),
              new TextRun({
                text: baptismDate,
                font: FONT_FAMILY,
                bold: true,
                size: 24, // 12pt
                color: COLOR_NAVY,
              }),
            ],
          }),

          // Location
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 500 },
            children: [
              new TextRun({
                text: "at SUBIC CHURCH OF CHRIST",
                font: FONT_FAMILY,
                size: 20, // 10pt
                color: COLOR_CHARCOAL,
              }),
            ],
          }),

          // Secondary Ornament
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "❦",
                font: FONT_FAMILY,
                size: 24,
                color: COLOR_GOLD,
              }),
            ],
          }),

          // Supportive Scripture Verse
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 900 },
            children: [
              new TextRun({
                text: "“Therefore, if anyone is in Christ, the new creation has come:\nThe old has gone, the new is here!”",
                font: FONT_FAMILY,
                italics: true,
                size: 16, // 8pt
                color: COLOR_CHARCOAL,
              }),
              new TextRun({
                text: "\n— 2 Corinthians 5:17",
                font: FONT_FAMILY,
                size: 14, // 7pt
                color: COLOR_GOLD,
                bold: true,
              }),
            ],
          }),

          // Signature Lines Space
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 500, after: 100 },
            children: [
              new TextRun({
                text: member.baptismExecutedBy ? member.baptismExecutedBy.toUpperCase() : "____________________________________",
                font: FONT_FAMILY,
                bold: !!member.baptismExecutedBy,
                color: member.baptismExecutedBy ? COLOR_NAVY : COLOR_GOLD,
                size: 20,
              }),
            ],
          }),

          // Signature Labels
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "OFFICIATED BY",
                font: FONT_FAMILY,
                bold: true,
                size: 16, // 8pt
                color: COLOR_NAVY,
              }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Officiating Minister / Pastor",
                font: FONT_FAMILY,
                italics: true,
                size: 16, // 8pt
                color: COLOR_MUTED,
              }),
            ],
          }),

          ...(member.baptismWitness1 || member.baptismWitness2 ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 100 },
              children: [
                new TextRun({
                  text: "WITNESSES",
                  font: FONT_FAMILY,
                  bold: true,
                  size: 16, // 8pt
                  color: COLOR_NAVY,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: member.baptismWitness2 ? 100 : 0 },
              children: [
                new TextRun({
                  text: member.baptismWitness1 || "____________________________________",
                  font: FONT_FAMILY,
                  italics: !!member.baptismWitness1,
                  size: 18,
                  color: COLOR_CHARCOAL,
                }),
              ],
            }),
            ...(member.baptismWitness2 ? [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: member.baptismWitness2,
                    font: FONT_FAMILY,
                    italics: true,
                    size: 18,
                    color: COLOR_CHARCOAL,
                  }),
                ],
              })
            ] : []),
          ] : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Baptismal_Certificate_${name.replace(/\s+/g, "_")}.docx`);
};
