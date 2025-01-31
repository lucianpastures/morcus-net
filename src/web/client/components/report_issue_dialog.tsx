import { useState } from "react";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

import { callApi } from "@/web/utils/rpc/client_rpc";
import { ReportApi } from "@/web/api_routes";
import { getCommitHash } from "@/web/client/define_vars";
import { TextField } from "@/web/client/components/generic/basics";

export function ReportIssueDialog(props: {
  show: boolean;
  onClose: () => any;
}) {
  const [reportText, setReportText] = useState<string>("");

  return (
    <Dialog
      open={props.show}
      onClose={props.onClose}
      PaperProps={{
        className: "bgColor",
      }}>
      <DialogTitle style={{ fontSize: 19, lineHeight: "normal" }}>
        <label htmlFor="Report issue box">
          <b>Report an issue</b>
        </label>
      </DialogTitle>
      <DialogContent>
        <DialogContentText style={{ fontSize: 16, lineHeight: "normal" }}>
          What did you do, what did you expect to see, and what did you actually
          see? <i>Do not enter personal information</i>.
        </DialogContentText>
        <TextField
          id="Report issue box"
          autoFocus
          onNewValue={setReportText}
          defaultValue={`${window.location.href}\n`}
          fullWidth
          multiline
          minRows={8}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} variant="text" color="info">
          Cancel
        </Button>
        <Button
          onClick={() => {
            const request = {
              reportText,
              commit: getCommitHash(),
            };
            callApi(ReportApi, request).catch(() => {});
            props.onClose();
          }}
          variant="contained">
          <b>Submit</b>
        </Button>
      </DialogActions>
    </Dialog>
  );
}
