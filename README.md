# healcode

An accessibility-focused web application that helps make the web more inclusive for everyone.

## Project Structure

```
healcode/
├── obsidian/              # Planning, mindmaps, and project documentation
│   ├── Healcode.canvas    # Project mindmap and planning visual
│   └── *.png              # Images referenced in the canvas
└── src/                   # Application source code
    ├── frontend/          # React frontend
    ├── backend/           # Node.js + Express backend
    └── ...                # Additional modules
```

## Overview

This project is being developed to address the gap in web accessibility tools. Many websites unintentionally exclude people with disabilities, and existing solutions are often expensive or limited.

### Value Proposition
- Make accessibility testing available to everyone without high costs
- Support developers, testers, and businesses who cannot afford $500-5000+/month solutions

### Planned Features
- Input: Any website URL
- Process: Download → Parse → Analyze → Report → Suggest Fixes
- Future: Automated fix implementations

## Tech Stack (Planned)

- **Frontend**: React
- **Backend**: Node.js + Express, Axe-core
- **Accessibility Standards**: WCAG (starting with contrast, headings, alt text)

## Planning & Documentation

For detailed project planning, architecture, and marketing notes, see [`obsidian/Healcode.canvas`](obsidian/Healcode.canvas).

## License

MPL-2.0 (compatible with commercial use)
