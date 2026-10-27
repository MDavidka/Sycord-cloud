import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "../components/ui";
import TerminalCanvas from "../components/TerminalCanvas";
export default function Terminal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <Screen title="Terminal" back={() => router.back()} scroll={false}>
      <TerminalCanvas id={id} />
    </Screen>
  );
}
