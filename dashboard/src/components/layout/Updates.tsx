import { useEffect, useState } from "react";
import { dataClient } from "../../api/dataClient";
import type { LastBuild } from "../../api/types";
import "./Updates.scss";

export function Updates() {
  const [build, setBuild] = useState<LastBuild | null>(null);

  useEffect(() => {
    dataClient.lastBuild().then(setBuild).catch(() => setBuild(null));
  }, []);

  if (!build) return null;

  const generated = new Date(build.generated_at);

  return (
    <div className="updates">
      Data as of {generated.toLocaleString()} · {build.date_range_start} to {build.date_range_end}
      {build.sampled && " (sampled run)"}
      {build.files_skipped > 0 && ` · ${build.files_skipped} source files unreadable/skipped`}
    </div>
  );
}
