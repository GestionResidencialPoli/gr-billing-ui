import "./styles.css";
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body><header><span className="brand">Gestión Residencial / Finanzas</span><span className="role">ADMINISTRACIÓN</span></header>{children}</body></html>; }
