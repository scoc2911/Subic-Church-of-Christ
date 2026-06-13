import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  PageBreak,
  Header,
  Footer,
  SimpleField
} from "docx";
import { Member } from "./api";

// -------------------------------------------------------------------------
// DESIGN HYPER-CONSTANTS & PALETTE
// -------------------------------------------------------------------------
const COLOR_PRIMARY = "014A75";    // Deep Navy
const COLOR_SECONDARY = "2CB0E1";  // Sky Blue
const COLOR_DARK = "1E293B";       // Charcoal
const COLOR_MUTED = "64748B";      // Slate Muted Gray
const COLOR_LIGHT = "F1F5F9";      // Light Background Accent
const COLOR_BORDER = "E2E8F0";     // Soft light border
const COLOR_WHITE = "FFFFFF";

const FONT_BODY = "Arial";
const FONT_HEADING = "Calibri";

// Helper to calculate age from birthday
function calculateAge(birthdayStr?: string): number | undefined {
  if (!birthdayStr) return undefined;
  try {
    const birthDate = new Date(birthdayStr);
    if (isNaN(birthDate.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    return undefined;
  }
}

// Generative ASCII graphic bars for statistics visual aid
function getProgressBar(percent: number): string {
  const barLength = 10;
  const filledLength = Math.round((percent / 100) * barLength);
  const filled = "█".repeat(Math.max(0, Math.min(barLength, filledLength)));
  const empty = "░".repeat(Math.max(0, Math.min(barLength, barLength - filledLength)));
  return `${filled}${empty}`;
}

// -------------------------------------------------------------------------
// BUILD BLOCKS UTILITIES
// -------------------------------------------------------------------------

// Page spacing
function createSpacer(points: number = 10) {
  return new Paragraph({
    spacing: { before: points * 20, after: 0 },
    children: [new TextRun("")]
  });
}

// Standard styled section title (Heading 1 equivalent with executive borders)
function createSectionHeader(title: string, subtitle?: string) {
  const children = [
    new TextRun({
      text: title,
      bold: true,
      size: 32, // 16pt
      color: COLOR_PRIMARY,
      font: FONT_HEADING
    })
  ];

  const parentParagraphs = [
    new Paragraph({
      children,
      spacing: { before: 400, after: subtitle ? 60 : 180 },
      keepNext: true
    })
  ];

  if (subtitle) {
    parentParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: subtitle,
            italics: true,
            size: 18, // 9pt
            color: COLOR_MUTED,
            font: FONT_BODY
          })
        ],
        spacing: { before: 0, after: 180 },
        keepNext: true
      })
    );
  }

  return parentParagraphs;
}

// Subsection title (Heading 2 equivalent)
function createSubsectionHeader(title: string) {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 24, // 12pt
        color: COLOR_DARK,
        font: FONT_HEADING
      })
    ],
    spacing: { before: 240, after: 100 },
    keepNext: true
  });
}

// Styled bullet points
function createBullet(text: string, boldPrefix?: string) {
  const children: TextRun[] = [];
  if (boldPrefix) {
    children.push(
      new TextRun({
        text: boldPrefix,
        bold: true,
        size: 20, // 10pt
        color: COLOR_DARK,
        font: FONT_BODY
      })
    );
  }
  children.push(
    new TextRun({
      text: text,
      size: 20, // 10pt
      color: COLOR_DARK,
      font: FONT_BODY
    })
  );

  return new Paragraph({
    children,
    bullet: { level: 0 },
    spacing: { before: 60, after: 60 }
  });
}

// Styled normal paragraphs with customizable line spaces
function createParagraph(text: string, options?: { bold?: boolean; italics?: boolean; size?: number; color?: string; align?: any; spacingAfter?: number; font?: string }) {
  return new Paragraph({
    alignment: options?.align || AlignmentType.LEFT,
    spacing: { before: 0, after: options?.spacingAfter !== undefined ? options.spacingAfter : 120 },
    children: [
      new TextRun({
        text: text,
        bold: options?.bold || false,
        italics: options?.italics || false,
        size: options?.size || 20, // defaults to 10pt
        color: options?.color || COLOR_DARK,
        font: options?.font || FONT_BODY
      })
    ]
  });
}

// Beautifully horizontal rule divider
function createHorizontalRule() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 12, // 1.5 pt
        space: 4,
        color: COLOR_SECONDARY
      }
    }
  });
}

// -------------------------------------------------------------------------
// TABLE CONSTRUCTION HELPERS (Portrait & Landscape Friendly)
// -------------------------------------------------------------------------
const defaultTableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_MUTED },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
};

interface TableHeaderCol {
  title: string;
  widthPercent: number;
  align?: any;
}

function buildStyledTable(headers: TableHeaderCol[], dataRows: Paragraph[][][]) {
  const headerCells = headers.map((col) => {
    return new TableCell({
      shading: { fill: COLOR_PRIMARY },
      width: { size: col.widthPercent, type: WidthType.PERCENTAGE },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [
        new Paragraph({
          alignment: col.align || AlignmentType.LEFT,
          children: [
            new TextRun({
              text: col.title,
              bold: true,
              color: COLOR_WHITE,
              size: 20, // 10pt
              font: FONT_HEADING
            })
          ]
        })
      ]
    });
  });

  const bodyRows = dataRows.map((rowCells, rIdx) => {
    const cellElements = rowCells.map((paragraphList, cIdx) => {
      const colDef = headers[cIdx];
      
      // Zebra striping for enhanced visual parsing
      const isEven = rIdx % 2 === 0;
      const shFill = isEven ? COLOR_WHITE : "F8FAFC";

      return new TableCell({
        shading: { fill: shFill },
        width: { size: colDef?.widthPercent || 20, type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: paragraphList
      });
    });

    return new TableRow({
      children: cellElements
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: defaultTableBorders,
    rows: [
      new TableRow({
        children: headerCells,
        cantSplit: true,
        tableHeader: true
      }),
      ...bodyRows
    ]
  });
}

// -------------------------------------------------------------------------
// COMPREHENSIVE DOCUMENT EXPORT BUILDER
// -------------------------------------------------------------------------
export async function buildWordReportBlob(members: Member[]): Promise<Blob> {
  // 1. STATS CALCULATION ENGINE
  const totalCount = members.length;
  
  // Status breakdown
  const statusCounts: Record<string, number> = {};
  // Gender breakdown
  const genderCounts: Record<string, number> = {};
  // Age groups
  const ageGroups = {
    "Children (0-12)": 0,
    "Teens (13-19)": 0,
    "Young Adults (20-35)": 0,
    "Adults (36-50)": 0,
    "Seniors (51+)": 0,
    "Unknown/Not Declared": 0
  };
  let sumAge = 0;
  let membersWithAge = 0;

  // Marital Breakdown
  const civilCounts: Record<string, number> = {};
  // Network Groups
  const networkCounts: Record<string, { count: number; leader: string }> = {};
  // Ministries
  const ministryCounts: Record<string, { count: number; head: string }> = {};
  // Voters
  let votersCount = 0;
  // Students
  let studentCount = 0;
  const schoolCounts: Record<string, number> = {};
  const courseCounts: Record<string, number> = {};
  // Baptized Metrics
  let baptizedCount = 0;

  members.forEach((m) => {
    // Status
    const status = m.membershipStatus || "Unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // Gender
    const gender = m.gender || "Unknown";
    genderCounts[gender] = (genderCounts[gender] || 0) + 1;

    // Baptism
    if (m.isBaptized === true) baptizedCount++;

    // Age
    let age = m.age;
    if (m.birthday) {
      const calc = calculateAge(m.birthday);
      if (calc !== undefined) age = calc;
    }

    if (age === undefined || age === null) {
      ageGroups["Unknown/Not Declared"]++;
    } else {
      sumAge += age;
      membersWithAge++;
      if (age <= 12) ageGroups["Children (0-12)"]++;
      else if (age <= 19) ageGroups["Teens (13-19)"]++;
      else if (age <= 35) ageGroups["Young Adults (20-35)"]++;
      else if (age <= 50) ageGroups["Adults (36-50)"]++;
      else ageGroups["Seniors (51+)"]++;
    }

    // Civil Status
    const civil = m.maritalStatus || "Not Specified";
    civilCounts[civil] = (civilCounts[civil] || 0) + 1;

    // Voters
    if (m.voter === true) votersCount++;

    // Education
    if (m.yearLevel && ["Elementary", "High School", "College", "Graduate School"].includes(m.yearLevel)) {
      studentCount++;
    }
    if (m.school && m.school !== "N/A" && m.school.trim() !== "") {
      const sch = m.school.trim();
      schoolCounts[sch] = (schoolCounts[sch] || 0) + 1;
    }
    if (m.course && m.course !== "N/A" && m.course.trim() !== "") {
      const crs = m.course.trim();
      courseCounts[crs] = (courseCounts[crs] || 0) + 1;
    }

    // Networks
    const net = (m.network || "").trim() || "No Cluster Network";
    const netLeader = m.networkLeader || "Unassigned";
    if (!networkCounts[net]) {
      networkCounts[net] = { count: 0, leader: netLeader };
    }
    networkCounts[net].count++;

    // Ministries
    const min = (m.ministry || "").trim() || "No Ministry Service";
    const minHead = m.ministryHead || "Unassigned";
    if (!ministryCounts[min]) {
      ministryCounts[min] = { count: 0, head: minHead };
    }
    ministryCounts[min].count++;
  });

  const averageAge = membersWithAge > 0 ? Math.round(sumAge / membersWithAge) : 0;

  // -------------------------------------------------------------------------
  // THE SECTIONS MATRIX
  // -------------------------------------------------------------------------

  // COVER PAGE (SECTION 1) - PORTRAIT WITH NO HEADERS
  const coverPageChildren: any[] = [
    createSpacer(5),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "SUBIC CHURCH OF CHRIST",
          bold: true,
          size: 28, // 14pt
          color: COLOR_SECONDARY,
          font: FONT_HEADING
        })
      ]
    }),
    createSpacer(1),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "DEMOGRAPHICS & STATISTICAL REGISTRY REPORT",
          bold: true,
          size: 40, // 20pt
          color: COLOR_PRIMARY,
          font: FONT_HEADING
        })
      ]
    }),
    createSpacer(1),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Comprehensive Ecclesial Member Breakdowns, Educational Tracking, and Leadership Indexes",
          italics: true,
          size: 20, // 10pt
          color: COLOR_MUTED,
          font: FONT_BODY
        })
      ]
    }),
    createSpacer(2),
    createHorizontalRule(),
    createSpacer(4),

    // Details Grid visual wrapper
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: "DOCUMENT METADATA",
          bold: true,
          size: 18,
          color: COLOR_MUTED,
          font: FONT_HEADING
        })
      ],
      spacing: { before: 0, after: 120 }
    }),

    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: "• Report Authority: ", bold: true, size: 20, font: FONT_BODY, color: COLOR_DARK }),
        new TextRun({ text: "Subic Church of Christ Board of Elders", size: 20, font: FONT_BODY, color: COLOR_DARK })
      ]
    }),
    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: "• Publication Date: ", bold: true, size: 20, font: FONT_BODY, color: COLOR_DARK }),
        new TextRun({ text: new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), size: 20, font: FONT_BODY, color: COLOR_DARK })
      ]
    }),
    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: "• Database Registry Size: ", bold: true, size: 20, font: FONT_BODY, color: COLOR_DARK }),
        new TextRun({ text: `${totalCount} Registered Communicant Members`, size: 20, font: FONT_BODY, color: COLOR_DARK })
      ]
    }),
    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: "• Security Level: ", bold: true, size: 20, font: FONT_BODY, color: COLOR_DARK }),
        new TextRun({ text: "INTERNAL ADMINISTRATIVE USE ONLY - STRICTLY CONFIDENTIAL", size: 20, font: FONT_BODY, color: "b91c1c" })
      ]
    }),
    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({ text: "• Registry Platform Version: ", bold: true, size: 20, font: FONT_BODY, color: COLOR_DARK }),
        new TextRun({ text: "v1.4 Enterprise Cloud Database Instance", size: 20, font: FONT_BODY, color: COLOR_MUTED })
      ]
    }),

    createSpacer(12),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "© 2026 Subic Church of Christ Directory and Church Administration. All Rights Reserved.",
          size: 16, // 8pt
          color: COLOR_MUTED,
          font: FONT_BODY
        })
      ]
    })
  ];

  // REAL DATA BODY CONTENT (SECTION 2) - WITH HEADER/FOOTER PAGE NUMBERING
  const bodyContent: any[] = [];

  // Table of Contents Header
  bodyContent.push(...createSectionHeader("Table of Contents", "Quick Document Directory Structure"));
  
  // Custom styled dot-leader Table of Contents
  const buildTocRow = (title: string, pNum: string) => {
    return new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [
        new TextRun({ text: title, bold: true, size: 20, color: COLOR_PRIMARY, font: FONT_HEADING }),
        new TextRun({ text: " " + ".".repeat(110 - title.length * 1.5) + " ", size: 18, color: COLOR_MUTED, font: FONT_BODY }),
        new TextRun({ text: pNum, bold: true, size: 20, color: COLOR_DARK, font: FONT_BODY })
      ]
    });
  };

  bodyContent.push(buildTocRow("1. Executive Administrative Summary", "3"));
  bodyContent.push(buildTocRow("2. Vital Registry Identifiers & Breakdowns", "4"));
  bodyContent.push(buildTocRow("   2.1 Membership Status Proportions", "4"));
  bodyContent.push(buildTocRow("   2.2 Gender Dispersal and Ratios", "4"));
  bodyContent.push(buildTocRow("3. Generational Cohort Profile Analysis", "5"));
  bodyContent.push(buildTocRow("4. Household & Marital Status Analytics", "6"));
  bodyContent.push(buildTocRow("5. Educational & Student Status Repositories", "7"));
  bodyContent.push(buildTocRow("6. Ecclesial Cluster Network Allocations", "8"));
  bodyContent.push(buildTocRow("7. Active Pastoral Ministry Services", "9"));
  bodyContent.push(buildTocRow("8. Master Registry Directory Appendix", "10"));

  bodyContent.push(createSpacer(2));
  bodyContent.push(new Paragraph({ children: [new PageBreak()] })); // Jump to executive summary on page 3

  // SECTION 1: EXECUTIVE SUMMARY
  bodyContent.push(...createSectionHeader("1. Executive Administrative Summary", "A high-level statistical overview of the Subic Church of Christ registry"));
  
  bodyContent.push(createParagraph(
    "This official report details the complete, real-time registry demographics and statistical distributions of standard communicants, attendees, and affiliate members of the Subic Church of Christ. Based on localized cloud registries, this dynamic record serves as the authoritative guide for planning resources, budgeting ministry groups, structuring pastorates, and tracking overall corporate fellowship trends."
  ));

  bodyContent.push(createSubsectionHeader("Primary Registry Highlights"));
  bodyContent.push(createBullet(`A consolidated database count of ${totalCount} active registrants.`, "Total Registry Enrollment: "));
  bodyContent.push(createBullet(`An average church membership age of ${averageAge} years, demonstrating a stable, multi-generational church population.`, "Mean Demographic Age: "));
  bodyContent.push(createBullet(`A total of ${votersCount} registered voters (${((votersCount / (totalCount || 1)) * 100).toFixed(1)}% of total roll), showing strong community engagement.`, "Civic Engagement: "));
  bodyContent.push(createBullet(`An enrollment of ${studentCount} active students in full-time courses, providing vital parameters for youth and education planning.`, "Educational Footprint: "));
  bodyContent.push(createBullet(`A total of ${baptizedCount} baptized covenant members (${((baptizedCount / (totalCount || 1)) * 100).toFixed(1)}% of the registry), symbolizing solid spiritual foundation.`, "Covenanted Baptism Rate: "));

  bodyContent.push(createSpacer(2));

  // Executive summary breakdown block
  const execSummaryHeaders = [
    { title: "Core Registry Metric", widthPercent: 40 },
    { title: "Calculated Statistic", widthPercent: 30, align: AlignmentType.RIGHT },
    { title: "Visual Proportion Bar", widthPercent: 30 }
  ];

  const execSummaryRows = [
    [
      [createParagraph("Active Registered Roll", { bold: true })],
      [createParagraph(`${totalCount} Members`, { align: AlignmentType.RIGHT })],
      [createParagraph("██████████ (100%)", { color: COLOR_SECONDARY })]
    ],
    [
      [createParagraph("SCOC Baptized Covenant")],
      [createParagraph(`${baptizedCount} Baptized`, { align: AlignmentType.RIGHT })],
      [createParagraph(`${getProgressBar((baptizedCount / (totalCount || 1)) * 100)} (${((baptizedCount / (totalCount || 1)) * 100).toFixed(1)}%)`, { color: COLOR_MUTED })]
    ],
    [
      [createParagraph("Civic Registered Voters")],
      [createParagraph(`${votersCount} Voters`, { align: AlignmentType.RIGHT })],
      [createParagraph(`${getProgressBar((votersCount / (totalCount || 1)) * 100)} (${((votersCount / (totalCount || 1)) * 100).toFixed(1)}%)`, { color: COLOR_MUTED })]
    ],
    [
      [createParagraph("Active Under-Education Student Hand")],
      [createParagraph(`${studentCount} Students`, { align: AlignmentType.RIGHT })],
      [createParagraph(`${getProgressBar((studentCount / (totalCount || 1)) * 100)} (${((studentCount / (totalCount || 1)) * 100).toFixed(1)}%)`, { color: COLOR_MUTED })]
    ]
  ];

  bodyContent.push(buildStyledTable(execSummaryHeaders, execSummaryRows));

  bodyContent.push(createSpacer(2));
  bodyContent.push(new Paragraph({ children: [new PageBreak()] }));

  // SECTION 2: VITAL REGISTRY IDENTIFIERS
  bodyContent.push(...createSectionHeader("2. Vital Registry Identifiers & Breakdowns", "Comparative data on current membership roles and genders"));
  
  bodyContent.push(createParagraph(
    "Analyzing the ratio of Active communications to transient or relocative members provides of-the-moment indicators on SCOC spiritual vitality. Similarly, understanding the raw gender census enables proper resource routing across specialized ministerial initiatives."
  ));

  bodyContent.push(createSubsectionHeader("2.1 Membership Status Proportions"));
  
  const statusTableHeaders = [
    { title: "Attendance & Membership Status", widthPercent: 40 },
    { title: "Total Registered", widthPercent: 30, align: AlignmentType.RIGHT },
    { title: "Calculated Percentage", widthPercent: 30, align: AlignmentType.RIGHT }
  ];

  const statusRows = Object.entries(statusCounts).map(([status, count]) => {
    const percentage = ((count / (totalCount || 1)) * 100).toFixed(1);
    return [
      [createParagraph(status, { bold: true })],
      [createParagraph(`${count} Members`, { align: AlignmentType.RIGHT })],
      [createParagraph(`${percentage}%`, { align: AlignmentType.RIGHT, color: COLOR_PRIMARY, bold: true })]
    ];
  });

  bodyContent.push(buildStyledTable(statusTableHeaders, statusRows));

  bodyContent.push(createSpacer(3));
  bodyContent.push(createSubsectionHeader("2.2 Gender Dispersal and Ratios"));

  const genderTableHeaders = [
    { title: "Declared Gender Identity", widthPercent: 40 },
    { title: "Consolidated Census Count", widthPercent: 30, align: AlignmentType.RIGHT },
    { title: "Calculated Percentage", widthPercent: 30, align: AlignmentType.RIGHT }
  ];

  const genderRows = Object.entries(genderCounts).map(([g, count]) => {
    const percentage = ((count / (totalCount || 1)) * 100).toFixed(1);
    return [
      [createParagraph(g, { bold: true })],
      [createParagraph(`${count} Members`, { align: AlignmentType.RIGHT })],
      [createParagraph(`${percentage}%`, { align: AlignmentType.RIGHT, color: COLOR_PRIMARY, bold: true })]
    ];
  });

  bodyContent.push(buildStyledTable(genderTableHeaders, genderRows));

  bodyContent.push(createSpacer(2));
  bodyContent.push(new Paragraph({ children: [new PageBreak()] }));

  // SECTION 3: GENERATIONAL COHORT PROFILES
  bodyContent.push(...createSectionHeader("3. Generational Cohort Profile Analysis", "Distribution of registered congregation members across life stages"));
  
  bodyContent.push(createParagraph(
    "A multi-generational church provides stability and continuous growth. By looking at age distribution curves, administrators can determine whether youth classes, mid-age fellowships, or eldercare program divisions should be prioritized in upcoming budget distributions."
  ));

  const ageTableHeaders = [
    { title: "Generational Cohort Bracket", widthPercent: 40 },
    { title: "Total Census", widthPercent: 30, align: AlignmentType.RIGHT },
    { title: "Calculated Percentage / Mini Graphic", widthPercent: 30, align: AlignmentType.RIGHT }
  ];

  const ageRows = Object.entries(ageGroups).map(([bracket, count]) => {
    const percentage = ((count / (totalCount || 1)) * 100).toFixed(1);
    return [
      [createParagraph(bracket, { bold: true })],
      [createParagraph(`${count} Members`, { align: AlignmentType.RIGHT })],
      [createParagraph(`${percentage}%  ${getProgressBar(parseFloat(percentage))}`, { align: AlignmentType.RIGHT, font: "Courier New" })]
    ];
  });

  bodyContent.push(buildStyledTable(ageTableHeaders, ageRows));
  bodyContent.push(createSpacer(2));
  bodyContent.push(createParagraph(
    `Demographic Age Insights: The calculated arithmetic mean age of the congregation is ${averageAge} Years. The values represent a healthy spread of youth, working-class households, and pioneering generation nodes.`,
    { italics: true, size: 18, color: COLOR_MUTED }
  ));

  bodyContent.push(createSpacer(2));
  bodyContent.push(new Paragraph({ children: [new PageBreak()] }));

  // SECTION 4: HOUSEHOLD & CIVIL STATUS
  bodyContent.push(...createSectionHeader("4. Household & Marital Status Analytics", "Family statuses and social composition within SCOC"));
  
  bodyContent.push(createParagraph(
    "A healthy local assembly is built on solid relational and family networks. Understanding the marital distribution allows ministerial coordinators to align couples retreats, single-professional fellowships, or counseling networks accurately."
  ));

  const civilTableHeaders = [
    { title: "Marital / Civil Status", widthPercent: 40 },
    { title: "Registry Count", widthPercent: 30, align: AlignmentType.RIGHT },
    { title: "Calculated Percentage", widthPercent: 30, align: AlignmentType.RIGHT }
  ];

  const civilRows = Object.entries(civilCounts).map(([status, count]) => {
    const percentage = ((count / (totalCount || 1)) * 100).toFixed(1);
    return [
      [createParagraph(status, { bold: true })],
      [createParagraph(`${count} Registrants`, { align: AlignmentType.RIGHT })],
      [createParagraph(`${percentage}%`, { align: AlignmentType.RIGHT, color: COLOR_PRIMARY, bold: true })]
    ];
  });

  bodyContent.push(buildStyledTable(civilTableHeaders, civilRows));

  bodyContent.push(createSpacer(2));
  bodyContent.push(new Paragraph({ children: [new PageBreak()] }));

  // SECTION 5: EDUCATIONAL & STUDENT STATUS
  bodyContent.push(...createSectionHeader("5. Educational & Student Status Repositories", "Academics tracking and university/school footprints"));
  
  bodyContent.push(createParagraph(
    "In line with standard youth outreach missions, SCOC closely keeps track of active collegiate enrollments, major courses, and localized university distributions to optimize campus study hubs, young-professional transition plans, and career guidance seminars."
  ));

  bodyContent.push(createSubsectionHeader("Top Enrolled / Represented Schools"));
  
  const topSchools = Object.entries(schoolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const schoolHeaders = [
    { title: "Registered School / Institution Name", widthPercent: 60 },
    { title: "Total Student Count", widthPercent: 40, align: AlignmentType.RIGHT }
  ];

  const schoolRows = topSchools.length > 0 
    ? topSchools.map(([school, count]) => [
        [createParagraph(school, { bold: true })],
        [createParagraph(`${count} Students`, { align: AlignmentType.RIGHT })]
      ])
    : [[
        [createParagraph("No active school enrollments logged in registry", { italics: true })],
        [createParagraph("0 Students", { align: AlignmentType.RIGHT })]
      ]];

  bodyContent.push(buildStyledTable(schoolHeaders, schoolRows));

  bodyContent.push(createSpacer(3));
  bodyContent.push(createSubsectionHeader("Top College Majors / Professional Courses"));

  const topCourses = Object.entries(courseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const courseHeaders = [
    { title: "Academic Program / Professional Discipline", widthPercent: 60 },
    { title: "Active Count", widthPercent: 40, align: AlignmentType.RIGHT }
  ];

  const courseRows = topCourses.length > 0
    ? topCourses.map(([course, count]) => [
        [createParagraph(course, { bold: true })],
        [createParagraph(`${count} Students`, { align: AlignmentType.RIGHT })]
      ])
    : [[
        [createParagraph("No dynamic courses registered in system", { italics: true })],
        [createParagraph("0 Students", { align: AlignmentType.RIGHT })]
      ]];

  bodyContent.push(buildStyledTable(courseHeaders, courseRows));

  bodyContent.push(createSpacer(2));
  bodyContent.push(new Paragraph({ children: [new PageBreak()] }));

  // SECTION 6: ECCLESIAL CLUSTERS & NETWORKS
  bodyContent.push(...createSectionHeader("6. Ecclesial Cluster Network Allocations", "Cell distributions and leadership team reach"));
  
  bodyContent.push(createParagraph(
    "Members of SCOC are organized into strategic cell clusters called networks. This geographic and affinity grouping enables excellent pastoral care, responsive emergency contact chains, and localized outreach programs."
  ));

  const networkTableHeaders = [
    { title: "Cluster Network Group", widthPercent: 35 },
    { title: "Default Leader / Coordinator", widthPercent: 35 },
    { title: "Member Census", widthPercent: 15, align: AlignmentType.RIGHT },
    { title: "Ratio", widthPercent: 15, align: AlignmentType.RIGHT }
  ];

  const networkRows = Object.entries(networkCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([netName, details]) => {
      const percentage = ((details.count / (totalCount || 1)) * 100).toFixed(1);
      return [
        [createParagraph(netName, { bold: true })],
        [createParagraph(details.leader)],
        [createParagraph(`${details.count}`, { align: AlignmentType.RIGHT })],
        [createParagraph(`${percentage}%`, { align: AlignmentType.RIGHT, color: COLOR_PRIMARY, bold: true })]
      ];
    });

  bodyContent.push(buildStyledTable(networkTableHeaders, networkRows));

  bodyContent.push(createSpacer(2));
  bodyContent.push(new Paragraph({ children: [new PageBreak()] }));

  // SECTION 7: ACTIVE PASTORAL MINISTRIES
  bodyContent.push(...createSectionHeader("7. Active Pastoral Ministry Services", "Ministerial groupings and specialized service teams"));
  
  bodyContent.push(createParagraph(
    "Dedicated ministries handle Sunday operations, church infrastructure, and outreach task teams. High member enrollment across ministries denotes a highly motivated and active congregation."
  ));

  const ministryTableHeaders = [
    { title: "Pastoral Ministry / Department", widthPercent: 35 },
    { title: "Ministry Head / Overseer", widthPercent: 35 },
    { title: "Volunteer Crew Count", widthPercent: 15, align: AlignmentType.RIGHT },
    { title: "Crew Ratio", widthPercent: 15, align: AlignmentType.RIGHT }
  ];

  const ministryRows = Object.entries(ministryCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([minName, details]) => {
      const percentage = ((details.count / (totalCount || 1)) * 100).toFixed(1);
      return [
        [createParagraph(minName, { bold: true })],
        [createParagraph(details.head)],
        [createParagraph(`${details.count}`, { align: AlignmentType.RIGHT })],
        [createParagraph(`${percentage}%`, { align: AlignmentType.RIGHT, color: COLOR_PRIMARY, bold: true })]
      ];
    });

  bodyContent.push(buildStyledTable(ministryTableHeaders, ministryRows));

  bodyContent.push(createSpacer(2));
  bodyContent.push(new Paragraph({ children: [new PageBreak()] }));

  // SECTION 8: MASTER REGISTRY APPENDIX
  bodyContent.push(...createSectionHeader("8. Master Registry Directory Appendix", "Active records database complete reference catalogue"));
  
  bodyContent.push(createParagraph(
    "Below is the complete tabular list of current registrants compiled directly from the live Firestore nodes. It contains fundamental administrative identifiers, baptism status, contact parameters, and active spiritual groups."
  ));

  const appendixTableHeaders = [
    { title: "ID", widthPercent: 12 },
    { title: "Full Registrant Name", widthPercent: 25 },
    { title: "Status", widthPercent: 12 },
    { title: "Baptized?", widthPercent: 12 },
    { title: "Cluster Network", widthPercent: 19 },
    { title: "Active Groups", widthPercent: 20 }
  ];

  const appendixRows = members
    .sort((a, b) => (a.lastName || "").localeCompare(b.lastName || ""))
    .map((m) => {
      const uId = m.membershipId || m.id?.substring(0, 8) || "N/A";
      const fullName = `${m.lastName || ""}, ${m.firstName || ""}`;
      const statusLabel = m.membershipStatus || "Active";
      const isBaptizedLabel = m.isBaptized ? "Covenant Yes" : "No";
      const clusterNet = m.network || "No Cluster";
      const actGroups = m.ministry || "General Attender";

      return [
        [createParagraph(uId, { size: 16, font: "Courier New" })],
        [createParagraph(fullName, { bold: true, size: 16 })],
        [createParagraph(statusLabel, { size: 16, color: statusLabel === "Active" ? "15803d" : "b91c1c" })],
        [createParagraph(isBaptizedLabel, { size: 16, color: m.isBaptized ? "0369a1" : "64748B" })],
        [createParagraph(clusterNet, { size: 16 })],
        [createParagraph(actGroups, { size: 16 })]
      ];
    });

  bodyContent.push(buildStyledTable(appendixTableHeaders, appendixRows));

  // -------------------------------------------------------------------------
  // ASSEMBLE ENTIRE DOCUMENT SECTIONS
  // -------------------------------------------------------------------------
  const doc = new Document({
    sections: [
      {
        properties: {
          titlePage: true // Hide footers/headers on page 1 (cover page)
        },
        children: coverPageChildren
      },
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 0, after: 120 },
                children: [
                  new TextRun({
                    text: "SUBIC CHURCH OF CHRIST | STATISTICAL DEMOGRAPHIC REPORT   ",
                    size: 16,
                    color: COLOR_MUTED,
                    font: FONT_HEADING,
                    bold: true
                  })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "_".repeat(95),
                    size: 14,
                    color: COLOR_BORDER,
                    font: FONT_BODY
                  })
                ],
                spacing: { before: 0, after: 120 }
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 0 },
                children: [
                  new TextRun({
                    text: "Page ",
                    size: 18,
                    color: COLOR_MUTED,
                    font: FONT_BODY
                  }),
                  new SimpleField("PAGE"),
                  new TextRun({
                    text: " of ",
                    size: 18,
                    color: COLOR_MUTED,
                    font: FONT_BODY
                  }),
                  new SimpleField("NUMPAGES"),
                  new TextRun({
                    text: "  |  CONFIDENTIAL",
                    size: 16,
                    color: "b91c1c",
                    font: FONT_HEADING,
                    bold: true
                  })
                ]
              })
            ]
          })
        },
        children: bodyContent
      }
    ]
  });

  return Packer.toBlob(doc);
}
