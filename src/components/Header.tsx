// 앱 제목/설명 + 로그인한 학생 인사말과 로그아웃 버튼
interface Props {
  studentName: string;
  onLogout: () => void;
}

export default function Header({ studentName, onLogout }: Props) {
  return (
    <header className="header">
      <div className="userbar">
        <span className="userbar-hi">
          <b>{studentName}</b>님, 환영해요! 👋
        </span>
        <button className="btn secondary small" type="button" onClick={onLogout}>
          로그아웃
        </button>
      </div>
      <h1>4학년 교과 어휘 학습 앱</h1>
      <p>국어 · 사회 · 과학 핵심 어휘를 카드와 퀴즈로 익혀요</p>
    </header>
  );
}
