# Divi 5 Generator Runbook

This is the short operational version of the generator workflow. Keep the full skill
file as the source of truth, but use this as the quick checklist for new runs.

## Preflight

1. Use the repo's local `divi5-page-generator` skill.
2. Read the repo skill instructions before generating anything.
3. Decide the concept, `MOTION` dial, and any DiviTheatre presets in the creative gate.
4. Confirm the output folder is `process.env.DIVI5_OUT` or `~/Desktop/Divi5 Pages`.

## Required flow

1. Run the creative gate first.
2. Author `page-spec.json` as the source artifact.
3. Run `node scripts/spec/validate-spec.js page-spec.json`.
4. Build the HTML preview with `node scripts/spec/spec-to-html.js page-spec.json > preview-[brand].html`.
5. Approve the preview interactively, or self-approve only in headless/brief mode.
6. Compile the Divi output with `node scripts/spec/spec-to-divi.js page-spec.json`.
7. Generate the page JSON, SEO sidecar, and schema in the Divi5 output folder.
8. Run `validate.js`.
9. Run `taste-check.js`.
10. Run the fidelity check against the approved mockup.
11. Import only after the gates pass.

Legacy generator scripts are a fallback path only. If used, run `node --check` before executing the script and keep the script in the output folder for reruns.

## Lessons learned

- Use `theatre:` on helper modules instead of hand-writing `module.advanced.attributes`.
- Write custom attributes to `module.decoration.attributes`, not `module.advanced.attributes`.
- Avoid shadowing Node globals such as `process`.
- Keep final `generate-*.js` files in the output folder for easy reruns and refinements.
- If the fidelity checker cannot parse headings from Divi block comments, mirror the outline in `json.content`.
- Treat the validator's `ANIMATION: no entrance animations found` warning as expected when motion is provided only through DiviTheatre `data-theatre` attributes.

## Output discipline

- Never write generated artefacts into the repo.
- Keep re-runnable generator scripts beside the generated output.
- Prefer small helper scripts that wrap generate → validate → taste → fidelity → import.
