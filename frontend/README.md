# Frontend (React + Vite)

The frontend is a Vite + React application that provides a dashboard to trigger calls, monitor live transcripts, and review summaries.

## Available scripts

```bash
npm run dev      # start Vite with backend proxy
npm run build    # production build
npm run preview  # preview the build output
npm run typecheck
```

## Mock toggle and reconnect behaviour

- The call form includes a **Mock Mode** switch that adds `useMock: true` to the `/api/call` payload and shows an “OFFLINE SIM” badge when active.
- The websocket client (`src/lib/ws.ts`) automatically reconnects with exponential backoff and surfaces connection errors as inline toasts.
- Completed calls expose “Download JSON” (transcript + summary) and “Copy Summary” actions.

## Customization tips

- Tailwind CSS is configured via `tailwind.config.js`. Adjust theme colours or extend utilities as needed.
- Global styles live in `src/index.css`.
- Zustand drives state in `src/store/useCall.ts`. Extend the store to capture additional metadata or analytics.
- UI components are in `src/components`. Swap in your own design system or CSS framework by replacing these components.

## Design guidance

- Status chips in `App.tsx` visualize the call progression. Add, remove, or restyle chips to match your product language.
- The transcript list uses `clsx` to differentiate between assistant and remote speakers. Customize colours for accessibility.
- Error messages are rendered as lightweight toasts—integrate your preferred notification system by replacing that block.
