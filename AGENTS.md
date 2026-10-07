<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep tenant detail as a dedicated authenticated route so its profile and contract links have a shareable, access-controlled URL.
- Reuse the unit detail's contract dialog for both contextual and standalone contract creation so the existing contract mutation remains the single creation path.
- Payment document extraction runs in the browser without AI (CSV/Excel by columns, PDF text by lines); images need manual entry. Why: no server OCR in the Worker runtime and AI is out of scope.
- Bank transactions only store a suggested contract, never a definitive assignment. Why: uncertain payments must be reviewed by a person.
