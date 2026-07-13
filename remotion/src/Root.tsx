import { Composition } from "remotion";
import { ReelTemplate } from "./ReelTemplate";

// Register one reusable 9:16 reel. Claude Code duplicates/edits ReelTemplate per brand.
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ReelTemplate"
      component={ReelTemplate}
      durationInFrames={18 * 30} // 18s @ 30fps
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
