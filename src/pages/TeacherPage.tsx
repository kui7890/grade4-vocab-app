import { useNavigate } from "react-router-dom";
import AdminPanel from "../components/AdminPanel";

// 교사용 화면 라우트(/teacher). 현재는 기존 관리자 패널(학생 목록/삭제)을 보여준다.
// (P4 단계에서 전체 현황·학생별 상세 등 탭 구조로 확장 예정)
export default function TeacherPage() {
  const navigate = useNavigate();
  return <AdminPanel onClose={() => navigate("/")} />;
}
