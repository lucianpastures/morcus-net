import { DictInfo } from "@/common/dictionaries/dictionaries";
import { LatinDict } from "@/common/dictionaries/latin_dicts";
import { RouteContext, Navigation } from "@/web/client/components/router";
import { autocompleteOptions } from "@/web/client/pages/dictionary/search/autocomplete_options";
import { isString } from "@/web/utils/rpc/parsing";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import InputAdornment from "@mui/material/InputAdornment";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Slider from "@mui/material/Slider";
import { DictChip } from "@/web/client/pages/dictionary/dict_chips";
import {
  DEFAULT_HIGHLIGHT_STRENGTH,
  GlobalSettingsContext,
} from "@/web/client/components/global_flags";

function toQuery(info: [DictInfo, string]): string {
  return `${info[1]},${info[0].key.replace("&", "n")}`;
}

function HighlightSlider(props: {
  highlightStrength: number;
  setHighlightStrength: (newValue: number) => any;
}) {
  const [value, setValue] = React.useState<number>(props.highlightStrength);

  return (
    <div>
      <DialogContentText sx={{ marginTop: 2 }}>
        Highlight Strength
      </DialogContentText>
      <Slider
        aria-label="Highlight Strength"
        getAriaValueText={(v) => `${v} %`}
        value={value}
        onChange={(_, newValue) => {
          if (typeof newValue !== "number") {
            return;
          }
          props.setHighlightStrength(newValue);
          setValue(newValue);
        }}
        valueLabelDisplay="off"
        step={10}
        marks
        min={10}
        max={90}
      />
    </div>
  );
}

function SearchSettingsDialog(props: {
  open: boolean;
  onClose: () => any;
  dicts: DictInfo[];
  setDicts: (newDicts: DictInfo[]) => any;
}) {
  const globalSettings = React.useContext(GlobalSettingsContext);

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      sx={{ top: "-40%" }}
      disableScrollLock={true}
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>Dictionary Options</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ marginTop: 2 }}>
          Enabled Dictionaries
        </DialogContentText>
        <FormGroup>
          {LatinDict.AVAILABLE.map((dict) => (
            <FormControlLabel
              key={dict.key}
              control={
                <Switch
                  checked={props.dicts.includes(dict)}
                  onChange={(e) => {
                    const dicts = new Set(props.dicts);
                    if (e.target.checked) {
                      dicts.add(dict);
                    } else {
                      dicts.delete(dict);
                    }
                    props.setDicts([...dicts]);
                  }}
                />
              }
              label={
                <span>
                  <DictChip label={dict.key} /> {dict.displayName}
                </span>
              }
            />
          ))}
        </FormGroup>
        <HighlightSlider
          highlightStrength={
            globalSettings.data.highlightStrength || DEFAULT_HIGHLIGHT_STRENGTH
          }
          setHighlightStrength={(v) => {
            globalSettings.setData({
              ...globalSettings.data,
              highlightStrength: v,
            });
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={props.onClose} color="info">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SearchSettings(props: { onOpenSettings: () => any }): JSX.Element {
  return (
    <IconButton
      aria-label="search settings"
      aria-haspopup="true"
      sx={{ marginRight: 0.5 }}
      onClick={props.onOpenSettings}
      id="DictSearchSettingsButton"
    >
      <SettingsIcon fontSize="medium" className="menuIcon" />
    </IconButton>
  );
}

export function DictionarySearch(props: {
  smallScreen: boolean;
  dicts: DictInfo[];
  setDicts: (newDicts: DictInfo[]) => any;
}) {
  const nav = React.useContext(RouteContext);
  const settings = React.useContext(GlobalSettingsContext);

  const [options, setOptions] = React.useState<[DictInfo, string][]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);

  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState<string>("");

  const numDicts = props.dicts.length;

  async function onEnter(searchTerm: string) {
    setOpen(false);
    if (searchTerm.length === 0) {
      return;
    }
    Navigation.query(nav, searchTerm, {
      experimentalSearch: settings.data.experimentalMode === true,
    });
  }

  async function loadOptions(searchTerm: string) {
    setLoading(true);
    const prefixOptions = await autocompleteOptions(
      searchTerm,
      props.dicts,
      200
    );
    setOptions(prefixOptions);
    setLoading(false);
  }

  return (
    <>
      <SearchSettingsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        dicts={props.dicts}
        setDicts={props.setDicts}
      />
      <Autocomplete
        freeSolo
        disableClearable
        onClose={() => setOpen(false)}
        open={open}
        loading={loading}
        loadingText={"Loading options..."}
        options={options}
        filterOptions={(x) => x}
        sx={{
          padding: props.smallScreen ? 0 : 1,
          paddingTop: 2,
          paddingBottom: 2,
          ml: props.smallScreen ? 0 : 3,
          mr: props.smallScreen ? 0 : 3,
          mt: 2,
          mb: 1,
        }}
        getOptionLabel={(option) => (isString(option) ? option : option[1])}
        onKeyUp={(event) =>
          event.key === "Enter" ? onEnter(input) : undefined
        }
        onChange={(event, value) => {
          if (event.type !== "click") {
            return;
          }
          setOpen(false);
          if (typeof value === "string") {
            setInput(value);
            onEnter(value);
          } else {
            setInput(value[1]);
            onEnter(toQuery(value));
          }
        }}
        onInputChange={(event, value) => {
          if (event.type === "click") {
            return;
          }
          setInput(value);
          setOpen(value.trim().length > 0);
          loadOptions(value);
        }}
        renderOption={(props, option) => (
          <li
            {...props}
            className={
              (props.className ? `${props.className} ` : "") + "autoCompOpt"
            }
            onClick={() => {
              setInput(option[1]);
              onEnter(toQuery(option));
            }}
            key={toQuery(option)}
          >
            <DictChip label={option[0].key} />
            <span style={{ marginLeft: 10 }}>{option[1]}</span>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={
              numDicts === 0
                ? "Enable a dictionary in settings"
                : `Search for a word (dictionaries: ${props.dicts
                    .map((d) => d.key)
                    .join(", ")})`
            }
            error={numDicts === 0}
            InputLabelProps={{
              className: "autoCompleteOutline",
            }}
            onClick={() => setOpen(input.length > 0)}
            autoFocus={nav.route.query === undefined}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    fontSize="medium"
                    className="menuIconFaded"
                    sx={{ marginLeft: 1.4 }}
                  />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <SearchSettings onOpenSettings={() => setDialogOpen(true)} />
                </InputAdornment>
              ),
            }}
          />
        )}
      />
    </>
  );
}
