import { useEffect, useState } from "react";
import { adminExportResearch, friendlyError, type ResearchExport } from "../../lib/api";
import { downloadCsv, toCsv, todayStamp, type CsvColumn } from "../../utils/csv";
import { WORD_BY_ID, wordLabel } from "../../utils/wordLookup";

// 정답률(%) — 시도가 없으면 빈 값
function ratio(correct: number, attempts: number): string {
  return attempts ? String(Math.round((correct / attempts) * 100)) : "";
}

// 내려받을 수 있는 파일 정의
type DatasetKey = keyof Omit<ResearchExport, "exported_at">;

interface Dataset {
  key: DatasetKey;
  label: string;
  description: string;
  file: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: CsvColumn<any>[];
}

const DATASETS: Dataset[] = [
  {
    key: "students",
    label: "학생 요약",
    description: "학생별 학습량·정답률·오답·숙달 어휘 수 (분석 기본 표)",
    file: "students",
    columns: [
      { key: "익명ID", value: (r) => r.anon_code },
      { key: "가입일", value: (r) => r.joined_at },
      { key: "푼문항수", value: (r) => r.attempts },
      { key: "정답수", value: (r) => r.correct },
      { key: "정답률(%)", value: (r) => ratio(r.correct, r.attempts) },
      { key: "미해결오답수", value: (r) => r.wrong_open },
      { key: "반복오답수", value: (r) => r.repeat_wrong },
      { key: "복습완료수", value: (r) => r.reviewed },
      { key: "숙달어휘수", value: (r) => r.mastered_words },
      { key: "학습일수", value: (r) => r.active_days },
      { key: "마지막학습", value: (r) => r.last_active },
    ],
  },
  {
    key: "responses",
    label: "문항 응답 로그",
    description: "문항 하나하나의 응답 기록 (가장 상세한 원자료)",
    file: "responses",
    columns: [
      { key: "익명ID", value: (r) => r.anon_code },
      { key: "어휘ID", value: (r) => r.word_id },
      { key: "어휘", value: (r) => wordLabel(r.word_id) },
      { key: "교과", value: (r) => r.subject },
      { key: "단원", value: (r) => r.unit },
      { key: "문항유형", value: (r) => (r.quiz_type === "meaning" ? "뜻맞히기" : "빈칸채우기") },
      { key: "정답여부", value: (r) => (r.is_correct ? 1 : 0) },
      { key: "선택한어휘", value: (r) => (r.chosen_word_id ? wordLabel(r.chosen_word_id) : "") },
      { key: "응답시각", value: (r) => r.answered_at },
    ],
  },
  {
    key: "mastery",
    label: "어휘 숙달 상태",
    description: "학생×어휘별 정답/오답 횟수와 숙달 여부",
    file: "mastery",
    columns: [
      { key: "익명ID", value: (r) => r.anon_code },
      { key: "어휘ID", value: (r) => r.word_id },
      { key: "어휘", value: (r) => wordLabel(r.word_id) },
      { key: "교과", value: (r) => r.subject },
      { key: "단원", value: (r) => WORD_BY_ID.get(r.word_id)?.unit ?? "" },
      { key: "상태", value: (r) => (r.status === "mastered" ? "숙달" : "연습중") },
      { key: "맞힌횟수", value: (r) => r.correct_count },
      { key: "틀린횟수", value: (r) => r.wrong_count },
      { key: "연속정답", value: (r) => r.consecutive_correct },
      { key: "최근학습", value: (r) => r.last_seen_at },
    ],
  },
  {
    key: "wrong_words",
    label: "오답 노트",
    description: "현재 오답으로 남아 있는 어휘",
    file: "wrong-words",
    columns: [
      { key: "익명ID", value: (r) => r.anon_code },
      { key: "어휘ID", value: (r) => r.word_id },
      { key: "어휘", value: (r) => wordLabel(r.word_id) },
      { key: "교과", value: (r) => WORD_BY_ID.get(r.word_id)?.subject ?? "" },
      { key: "등록시각", value: (r) => r.added_at },
    ],
  },
  {
    key: "reviews",
    label: "복습 완료 기록",
    description: "학생이 복습 완료를 누른 이력",
    file: "reviews",
    columns: [
      { key: "익명ID", value: (r) => r.anon_code },
      { key: "어휘ID", value: (r) => r.word_id },
      { key: "어휘", value: (r) => wordLabel(r.word_id) },
      { key: "복습시각", value: (r) => r.reviewed_at },
    ],
  },
  {
    key: "assignments",
    label: "배정 학습 수행",
    description: "교사가 배정한 학습의 수행 결과",
    file: "assignments",
    columns: [
      { key: "익명ID", value: (r) => r.anon_code },
      { key: "배정제목", value: (r) => r.title },
      { key: "유형", value: (r) => (r.set_type === "review" ? "오답복습" : "교과어휘") },
      { key: "교과", value: (r) => r.subject },
      { key: "어휘수", value: (r) => r.word_count },
      { key: "점수", value: (r) => r.score },
      { key: "문항수", value: (r) => r.total },
      { key: "완료시각", value: (r) => r.completed_at },
    ],
  },
];

// 교사 대시보드 - 연구 자료 내보내기
interface Props {
  pin: string;
}

export default function ExportTab({ pin }: Props) {
  const [data, setData] = useState<ResearchExport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    adminExportResearch(pin)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((err) => {
        if (active) setError(friendlyError(err instanceof Error ? err.message : ""));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pin]);

  function download(ds: Dataset) {
    if (!data) return;
    const rows = data[ds.key];
    downloadCsv(`vocab-${ds.file}-${todayStamp()}.csv`, toCsv(rows, ds.columns));
  }

  function downloadAll() {
    // 브라우저가 연속 다운로드를 막지 않도록 약간 간격을 둔다.
    DATASETS.forEach((ds, i) => window.setTimeout(() => download(ds), i * 400));
  }

  if (loading) return <p className="dash-muted">불러오는 중…</p>;
  if (error) return <div className="notice">{error}</div>;
  if (!data) return null;

  const totalRows = DATASETS.reduce((sum, ds) => sum + data[ds.key].length, 0);

  return (
    <div>
      <section className="panel dash-section">
        <h3 className="dash-title">연구 자료 내보내기</h3>
        <p className="dash-muted">
          학생 <b>이름은 포함되지 않고</b> 익명 ID(S001…)만 내보냅니다. 엑셀에서 바로 열 수 있는
          UTF-8 CSV 형식입니다.
        </p>
        <p className="dash-muted" style={{ marginTop: 6 }}>
          현재 내보낼 수 있는 행 <b>{totalRows}</b>개 · 기준 시각{" "}
          {new Date(data.exported_at).toLocaleString("ko-KR")}
        </p>

        <div className="dash-actions" style={{ marginTop: 16, marginBottom: 0 }}>
          <button className="btn" type="button" onClick={downloadAll} disabled={totalRows === 0}>
            📦 전체 파일 내려받기
          </button>
        </div>
      </section>

      <section className="panel dash-section">
        <h3 className="dash-title">파일별 내려받기</h3>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>자료</th>
                <th>설명</th>
                <th className="num">행 수</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {DATASETS.map((ds) => {
                const count = data[ds.key].length;
                return (
                  <tr key={ds.key}>
                    <td className="strong">{ds.label}</td>
                    <td className="muted" style={{ whiteSpace: "normal" }}>
                      {ds.description}
                    </td>
                    <td className="num">{count}</td>
                    <td>
                      <button
                        className="btn secondary small"
                        type="button"
                        disabled={count === 0}
                        onClick={() => download(ds)}
                      >
                        CSV 받기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
