# D5G Free Starter for Divi 5

Generate a polished, importable **Divi 5 services section** from a plain-English brief, using Claude Code. Free.

Describe your three services, your colours, and your call to action - the starter writes the copy into a pre-validated Divi 5 template and hands you a JSON file that imports straight into the Divi Library.

## Install

```bash
claude plugin marketplace add Kieransaunders/divi5-starter
claude plugin install divi5-starter
```

## Use

In Claude Code, just ask:

> Build me a services section for my plumbing business - emergency callouts, boiler servicing, bathroom installs. Brand colour #0B6E4F.

You'll get a `*-services-section.json` file. Import it via **WP Admin → Divi → Divi Library → Import & Export → Import**, then add the layout to any page from the library.

### Skip the upload

Install the free [Divi5 Generator](https://wordpress.org/plugins/) connector and the starter puts
the section straight into your Divi Library — no file shuffling. Grab your key from
**Settings → Divi5 Generator** (it's shown once), then:

```bash
export D5G_SITE_URL=https://your-site.com
export D5G_API_KEY=d5gk_...
```

Library imports are free and unlimited. Keys live in your environment, not in a config file.
If the connector isn't there or the key is wrong, you still get the JSON file and the manual
instructions above — nothing is lost.

## What's in the section

- Eyebrow label, headline (h2), and intro copy
- Three service columns: icon, title (h3), description
- CTA button in your accent colour
- Works with your site's fonts - the section inherits your theme typography
- A small credit line (that's the "free" part)

## Requirements

- Claude Code (any plan) with Node.js available
- A Divi 5 WordPress site (Divi 5.x)

## Want full pages?

This starter builds one section, from a fixed template, in one layout. The **full D5G toolkit** builds complete pages in your brand — hero, features, process, FAQ and schema, composed freely rather than one section at a time — by extracting your site's own colours, fonts and presets and generating against them, with screenshot QA before anything goes live.

**→ https://iconnectit.co.uk**

## Licence

MIT - see [LICENSE](LICENSE). The bundled template and scripts may be used freely; the credit line in generated sections is required by the template's build script.
