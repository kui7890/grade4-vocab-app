import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Header from "../components/Header";
import MainNav from "../components/MainNav";

// 로그인한 학생의 최상위 레이아웃: 헤더 + 메인 내비 + 하위 라우트.
// (대시보드, 학습 화면 모두 이 레이아웃 안에 들어간다)
export default function AppLayout() {
  const { student, logout } = useAuth();
  return (
    <div className="app">
      <Header studentName={student?.username ?? ""} onLogout={logout} />
      <MainNav />
      <Outlet />
    </div>
  );
}
