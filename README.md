# OIBSIP — Web Development & Designing

This repository holds my submissions for the AICTE Oasis Infobyte Internship Program (November 2026 cohort). My offer letter assigned me the Web Development and Designing track, so I worked through every task in Level 1 and Level 2.

All the projects are plain HTML/CSS/JavaScript with no build tools and no external dependencies. Each folder can be served on its own; there is nothing to install.

## Tasks

| Level | Task | Project | Folder | Live demo | Demo video |
|-------|------|---------|--------|-----------|------------|
| 1 | Task 1 | Landing Page — "Aether", a fictional focus workspace | [WebDev-L1-LandingPage](WebDev-L1-LandingPage) | [Open](https://sushant-me.github.io/OIBSIP/WebDev-L1-LandingPage/) | [demo.mp4](WebDev-L1-LandingPage/demo/demo.mp4) |
| 1 | Task 2 | Personal Portfolio | [WebDev-L1-Portfolio](WebDev-L1-Portfolio) | [Open](https://sushant-me.github.io/OIBSIP/WebDev-L1-Portfolio/) | [demo.mp4](WebDev-L1-Portfolio/demo/demo.mp4) |
| 1 | Task 3 | Temperature Converter | [WebDev-L1-TemperatureConverter](WebDev-L1-TemperatureConverter) | [Open](https://sushant-me.github.io/OIBSIP/WebDev-L1-TemperatureConverter/) | [demo.mp4](WebDev-L1-TemperatureConverter/demo/demo.mp4) |
| 2 | Task 1 | Calculator | [WebDev-L2-Calculator](WebDev-L2-Calculator) | [Open](https://sushant-me.github.io/OIBSIP/WebDev-L2-Calculator/) | [demo.mp4](WebDev-L2-Calculator/demo/demo.mp4) |
| 2 | Task 2 | Tribute Page — Ada Lovelace | [WebDev-L2-TributePage](WebDev-L2-TributePage) | [Open](https://sushant-me.github.io/OIBSIP/WebDev-L2-TributePage/) | [demo.mp4](WebDev-L2-TributePage/demo/demo.mp4) |
| 2 | Task 3 | To-Do Web App — "Taskline" | [WebDev-L2-TodoApp](WebDev-L2-TodoApp) | [Open](https://sushant-me.github.io/OIBSIP/WebDev-L2-TodoApp/) | [demo.mp4](WebDev-L2-TodoApp/demo/demo.mp4) |
| 2 | Task 4 | Login Authentication System — "Latch" | [WebDev-L2-LoginAuth](WebDev-L2-LoginAuth) | [Open](https://sushant-me.github.io/OIBSIP/WebDev-L2-LoginAuth/) | [demo.mp4](WebDev-L2-LoginAuth/demo/demo.mp4) |

Each task folder has its own `README.md` with the feature checklist, screenshots, and run instructions, plus a `demo-notes.md` describing what to click while recording the walkthrough.

## Running a project

```bash
cd WebDev-L1-LandingPage   # or any other task folder
python3 -m http.server 8000
# then open http://localhost:8000
```

The projects also open directly from `index.html`, except the login system: it uses `crypto.subtle` for password hashing, which needs a secure context, so serve it over `localhost` rather than opening the file directly.

## A few notes

- Screenshots in each folder were captured from the finished pages at desktop (1440 px) and mobile (390 px) widths.
- The landing page is for a made-up product. Its testimonials and numbers are labelled as placeholder content on the page itself.
- The login system is a front-end demo. It stores salted SHA-256 hashes in `localStorage`, not plaintext passwords, but it is not production authentication — anyone with DevTools can read or change that storage.
- The tribute page portrait is the public-domain Chalon watercolour of Ada Lovelace from Wikimedia Commons, credited in the page footer.

## Author

Sushant Poudel — Web Development and Designing intern, AICTE Oasis Infobyte SIP.
[GitHub](https://github.com/sushant-me) · [LinkedIn](https://www.linkedin.com/in/sushant-poudel2028/) · sushant.poudel2028@gmail.com
