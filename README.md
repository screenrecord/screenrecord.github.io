# ScreenRecord Web Tool

![ScreenRecord Preview](https://res.cloudinary.com/dpx6w78bt/image/upload/f_auto/q_auto/v1786342039/Online_Tool_rc1ybr.png)

A 100% client-side, zero-install web screen and audio recorder built with Astro, React, and Tailwind CSS. Captures screen, window, tab, microphone, and webcam directly in the browser with zero server uploads.

## 🚀 Features
- **100% Private:** All video processing is done entirely in the client's RAM using the browser's native MediaRecorder API. No data is ever uploaded to a server.
- **Multiple Recording Modes:** Capture full screen, window, browser tab, webcam, or audio-only.
- **Internationalization (i18n):** Native support for English, Spanish, Portuguese, German, French, and Japanese via Astro subpath routing.
- **Dark & Light Mode:** System-preference aware theme system with an instant anti-FOUC toggle.
- **Zero Install:** No desktop software, browser extensions, or plugins required.
- **No Watermarks:** Unlimited recording length and clean, watermark-free downloads.

## 🛠 Tech Stack
- **Framework:** Astro (Static Site Generation mode)
- **UI Components:** React (Astro Islands)
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Hosting:** GitHub Pages via GitHub Actions

## 🌍 SEO & Accessibility
- Achieves a **100/100 Technical SEO score**.
- Fully configured Open Graph, Twitter Cards, and dynamic Canonical URLs for all languages.
- Structured Data (Schema Markup) via JSON-LD for Software Application, FAQ, and Breadcrumb structures.
- Automatic Sitemap generation (`@astrojs/sitemap`) resolving to `sitemap-index.xml`.
- Screen reader-friendly with comprehensive `aria-labels` and optimized heading hierarchies.

## 💻 Local Development

Clone the repository and install dependencies:

```sh
git clone https://github.com/yourusername/screenrecord.github.io.git
cd screenrecord.github.io
npm install
```

Start the local development server:

```sh
npm run dev
```

The site will be available at `http://localhost:4321`.

## 📦 Building & Deploying

This project is configured to automatically deploy to GitHub Pages whenever changes are pushed to the `main` branch, handled via the `.github/workflows/deploy.yml` workflow.

To build the project manually:
```sh
npm run build
```

## ☕ Support
If you find this tool helpful, consider supporting the developer via [Buy Me a Coffee](https://buymeacoffee.com/kisharadilz).
