# Case 7 — Performance Appraisal Bias

MBA212B · Managing & Developing Human Resources

HTML presentation deck. Dark Bold Signal theme, keyboard + touch nav, mobile-friendly, QR on title slide.

## Structure

```
index.html          shell (chrome + slide container)
styles.css          all styles
script.js           slide loader + presentation controller
slides/             one file per slide
  01-title.html
  02-brief.html
  03-situation.html
  04-dilemma.html
  05-perspectives.html
  06-analysis.html
  07-recommendation.html
  08-rollout.html
  09-insight.html
  10-references.html
  11-closing.html
```

## Local preview

Slides are loaded via `fetch`, so `file://` will not work. Run a local server:

```bash
cd case7-deploy && python3 -m http.server 8000
# open http://localhost:8000
```

## Navigation

- `←` `→` `space` · keyboard
- swipe up/down · touch
- dots on right · click any
