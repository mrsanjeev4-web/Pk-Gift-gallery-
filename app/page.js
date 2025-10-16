import ImageAdjuster from "./components/ImageAdjuster";

export default function Page() {
  return (
    <main>
      <h1>PK Gift Gallery  Design Studio</h1>
      <p>Create your custom t-shirt design. Upload a t-shirt as background, add your design as foreground, then adjust size and position. Download your creation when ready.</p>
      <ImageAdjuster />
    </main>
  );
}