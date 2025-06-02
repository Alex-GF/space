import React, { useState } from "react";
import LightBackground from "@/layouts/background";
import Sidebar from "./components/sidebar";

interface LoggedLayoutProps {
  readonly children: React.ReactNode;
}

export default function LoggedLayout({ children }: LoggedLayoutProps) {
  
  const [collapsed, setCollapsed] = useState(false);

  const paddingClass = collapsed ? 'pl-[64px]' : 'pl-[280px]';
    
    return (
      <LightBackground>
        <div className="flex w-full min-h-screen">
          <div className={`flex-1 pr-0 ${paddingClass} transition-all duration-300`}>
            {children}
          </div>
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed}/>
        </div>
      </LightBackground>
    );
}
