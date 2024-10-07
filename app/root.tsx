import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigate,
} from "@remix-run/react";
import styles from "./styles/main.css?url";
import { LinksFunction } from "@remix-run/node";

import 'react-toastify/dist/ReactToastify.css';
import { useEffect, useRef, useState } from "react";
import { ToastContainer, Zoom } from "react-toastify";
import { IpcAPI } from "./loaderContextType";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
];

export interface GlobalSettings {
  autosave: boolean,
  theme: "autumn" | "neon" | "lavender" | "blue",
  fontSize: number,
  compact: boolean,
  imperialUnits: boolean
}

export default function App() {

  const navigate = useNavigate();
  const location = useLocation();
  let loaded = useRef(false);

  const [counter, setCounter] = useState<number>(0);
  const rerender = () => { setCounter((x) => x + 1) };

  const [settings, setSettings] = useState<GlobalSettings>({ autosave: true, theme: "neon", fontSize: 1, imperialUnits: true, compact: false });

  useEffect(() => {
    if (localStorage.getItem("settings"))
      setSettings(() => { return { ...settings, ...JSON.parse(localStorage.getItem("settings")!) }; });
    else {
      setSettings({ ...settings, theme: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)') ? "neon" : "blue" });
    }
    loaded.current = true;
  }, [counter]);

  useEffect(() => {
    if (location.pathname !== '/' && location.pathname.slice(-1)[0] === '/') {
      navigate(`${location.pathname.slice(0, -1)}${location.search}${location.hash}`, { state: location.state, replace: true });
    }
  }, [location]);

  useEffect(() => {
    let ipcApi = (window as unknown as { api: IpcAPI }).api;
    ipcApi.onSettingsUpdate(
      (update) => {
        let newSettings = { ...settings, ...update };
        localStorage.setItem("settings", JSON.stringify(newSettings));
        setSettings(newSettings);
        rerender();
      }
    );
  }, [settings])

  let theme: string;
  switch (settings.theme) {
    case "autumn":
      theme = "autumn-theme";
      break;
    case "neon":
      theme = "neon-theme";
      break;
    case "lavender":
      theme = "lavender-theme";
      break;
    case "blue":
      theme = "light-theme";
      break;
  }

  return (
    <html lang="en" style={{ fontSize: `${settings.fontSize}em` }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className={`${theme} ${settings.compact ? "compact-body" : "non-compact-body"}`}>
        {
          loaded.current ?
            <Outlet context={rerender} /> : []
        }
        <ToastContainer
          position="top-center"
          autoClose={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          theme="colored"
          transition={Zoom}
        />

        <ScrollRestoration />
        <Scripts />
      </body>

    </html>
  );
}
