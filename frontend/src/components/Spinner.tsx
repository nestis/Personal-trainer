const s: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '80px 20px',
  },
};

function Spinner() {
  return (
    <div style={s.container}>
      <div className="spinner" />
    </div>
  );
}

export default Spinner;
