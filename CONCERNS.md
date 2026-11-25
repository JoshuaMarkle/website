# Concerns

What is known to be open, as of 2026-11-25. Take items out as they are done.

## Before release

- [ ] **Old URLs.** The site live until now has `/library`, `/projects/<slug>` and `/keyboard`, which will reach the 404 page. The library is dropped on purpose. A redirect in `vercel.json` would keep the other links working. `/papers` and `/resume` were never live.
- [ ] **No share image.** Pages have no Open Graph or Twitter tags, so a shared link shows no picture. An older card is in history at `pre-redesign-backup`, `public/images/twitter-card.png`.
- [ ] **No sitemap, `robots.txt` or canonical URLs.** Astro's `site` is not set; it should be `https://joshuamarkle.com`.
- [ ] **The favicon is a placeholder,** a plain purple dot. Older ones are in the same place.
- [ ] **Nine post images load from other sites,** including Reddit, Geekhack, shops and a DuckDuckGo proxy. All loaded on 2026-11-25. They can vanish, and one is 5,984 px wide. Check they can be reused, then copy them in, resize them and add alt text to the ones in the Corne guide.

## Resume (left alone for now)

- [ ] It shows a phone number. Decide if that should be public.
- [ ] It does not list GECKO or JAGUAR, two of the four main projects on the site.

## Not tested

- [ ] Real phones and tablets
- [ ] Safari and Firefox
- [ ] The Live links on the project panels. Source repos were checked and are public.
- [ ] Recovery when the graphics context is lost. `stage.js` stops the default but has no code of its own to restore what was drawn.
- [ ] Screen readers
- [ ] Node 22, which the host uses. The build was run on Node 26.

## Improvements

- [ ] **Script size.** Every page, plain posts included, loads one 746 KB script (about 209 KB compressed). The 3D code could load after the text.
- [ ] **Home page HTML is 130 KB,** about half of it project data that repeats the logo shapes.
- [ ] **Frame rate.** In a production build on an Intel Iris Xe laptop at 1440 by 900, the wall held 60 fps. The dev server gave 41 on the wall and 54 on the blog. Nothing slower has been measured.
- [ ] **Contact.** The footer has Email and GitHub only. LinkedIn and the resume could go there.
- [ ] **The Corne preview is a drawing.** Use a real photo.
- [ ] **The newest post** says "its" for "it's" twice, and its folder `public/blog/start-ugly/` holds an image nothing uses (179 KB).

## Later

- [ ] **Project pages,** so one project can be linked to. The old write-ups for GECKO, AlgoType, JAGUAR, Milestone and UVA Chatbot are in git history at `6e6b3c4`, in `src/content/projects/`.
