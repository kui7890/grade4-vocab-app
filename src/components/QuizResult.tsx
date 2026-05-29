// 퀴즈 결과 화면
interface Props {
  score: number;
  total: number;
  onRestart: () => void;
}

export default function QuizResult({ score, total, onRestart }: Props) {
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);

  // 점수에 따라 격려 문구를 다르게 보여 준다.
  let message = "조금 더 연습해 볼까요? 틀린 어휘는 오답 복습에서 다시 볼 수 있어요.";
  let emoji = "💪";
  if (percent === 100) {
    message = "모두 맞혔어요! 정말 훌륭해요.";
    emoji = "🏆";
  } else if (percent >= 60) {
    message = "잘했어요! 틀린 어휘만 다시 복습하면 완벽해요.";
    emoji = "🌟";
  }

  return (
    <div className="panel result">
      <div className="empty emoji" style={{ fontSize: 56 }}>
        {emoji}
      </div>
      <div className="score">
        {score} / {total}
      </div>
      <p style={{ fontWeight: 700, fontSize: 20 }}>이번 퀴즈 정답률 {percent}%</p>
      <p style={{ color: "var(--text-soft)" }}>{message}</p>
      <div className="actions">
        <button className="btn" onClick={onRestart}>
          🔄 다시 풀기
        </button>
      </div>
    </div>
  );
}
