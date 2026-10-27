import { Linking } from "react-native";
import { origin } from "../lib/api";
import { Body, Button } from "./ui";
export default function TerminalCanvas({ id }: { id?: string }) {
  return (
    <>
      <Body>
        The interactive terminal opens in your browser. On iOS and Android it is
        embedded in this screen.
      </Body>
      <Button
        label="Open terminal"
        onPress={() =>
          void Linking.openURL(
            origin +
              "/terminal" +
              (id ? "?server=" + encodeURIComponent(id) : ""),
          )
        }
      />
    </>
  );
}
