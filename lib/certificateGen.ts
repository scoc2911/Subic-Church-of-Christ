import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { Member } from "./api";

const FONT_FAMILY = "Georgia";
const COLOR_NAVY = "002147";    // Deep Royal Navy
const COLOR_GOLD = "9A7B56";    // Premium Warm Gold Accent
const COLOR_CHARCOAL = "333333"; // Standard Body text
const COLOR_MUTED = "666666";    // Muted Subtitles & Details

export const generateBaptismalCertificate = async (member: Member) => {
  const name = `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Member Name";
  const baptismDate = member.baptismDate 
    ? new Date(member.baptismDate).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) 
    : "_______________";
  const birthDay = member.birthday
    ? new Date(member.birthday).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })
    : undefined;

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
          // Header Accent / Space
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
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
