export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.02} />
      <directionalLight position={[50, 30, 20]} intensity={0.1} color="#ffffff" />
    </>
  );
}
