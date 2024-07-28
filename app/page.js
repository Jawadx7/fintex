import ButtonLink from "./components/ButtonLink";

export default function Home() {
  return (
    <h1 className="text-[3rem]">
      Hello, from the Home Page
      <br />
      <ButtonLink text="About" path="/about" />
    </h1>
  );
}
