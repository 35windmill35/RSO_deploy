const colorMap: Map<string, string> = new Map([
  ["dkdkred", "#3f0000"],
  ["dkred", "#7f0000"],
  ["dkltred", "#bf0000"],
  ["red", "#ff0000"],
  ["ltdkred", "#ff3f3f"],
  ["ltred", "#ff7f7f"],
  ["ltltred", "#ffbfbf"],
  ["darkdarkred", "#3f0000"],
  ["darkred", "#7f0000"],
  ["lightdarkred", "#ff3f3f"],
  ["lightred", "#ff7f7f"],
  ["lightlightred", "#ffbfbf"],
  ["dkdkyellow", "#3f3f00"],
  ["dkyellow", "#7f7f00"],
  ["dkltyellow", "#bfbf00"],
  ["yellow", "#ffff00"],
  ["ltdkyellow", "#ffff3f"],
  ["ltyellow", "#ffff7f"],
  ["ltltyellow", "#ffffbf"],
  ["darkdarkyellow", "#3f3f00"],
  ["darkyellow", "#7f7f00"],
  ["lightdarkyellow", "#ffff3f"],
  ["lightyellow", "#ffff7f"],
  ["lightlightyellow", "#ffffbf"],
  ["dkdkgreen", "#003f00"],
  ["dkgreen", "#007f00"],
  ["dkltgreen", "#00bf00"],
  ["green", "#00ff00"],
  ["ltdkgreen", "#3fff3f"],
  ["ltgreen", "#7fff7f"],
  ["ltltgreen", "#bfffbf"],
  ["darkdarkgreen", "#003f00"],
  ["darkgreen", "#007f00"],
  ["lightdarkgreen", "#3fff3f"],
  ["lightgreen", "#7fff7f"],
  ["lightlightgreen", "#bfffbf"],
  ["gray", "#7f7f7f"],
  ["dkdkorange", "#3f2c00"],
  ["dkorange", "#7f5900"],
  ["dkltorange", "#bf8600"],
  ["orange", "#ffb200"],
  ["ltdkorange", "#fff13f"],
  ["ltorange", "#ffff7f"],
  ["ltltorange", "#ffffbf"],
  ["darkdarkorange", "#3f2c00"],
  ["darkorange", "#7f5900"],
  ["lightdarkorange", "#fff13f"],
  ["lightorange", "#ffff7f"],
  ["lightlightorange", "#ffffbf"],
  ["warning", "#ffcc55"],
  ["info", "#dcd7c8"],
  ["dkdkblue", "#00003f"],
  ["dkblue", "#00007f"],
  ["dkltblue", "#0000bf"],
  ["blue", "#0000ff"],
  ["ltdkblue", "#3f3fff"],
  ["ltblue", "#7f7fff"],
  ["ltltblue", "#bfbfff"],
  ["darkdarkblue", "#00003f"],
  ["darkblue", "#00007f"],
  ["lightdarkblue", "#3f3fff"],
  ["lightblue", "#7f7fff"],
  ["lightlightblue", "#bfbfff"],
]);

const convertColorToString = (value: number | undefined) => {
  let color = "";
  if (value) {
    if (value < 0) value = 0;
    color = value.toString(16);
    if (color.length < 6) {
      color = ("000000" + color).slice(-6);
    }
    const colorR = color.slice(4, 6);
    const colorG = color.slice(2, 4);
    const colorB = color.slice(0, 2);
    color = "#" + colorR + colorG + colorB;
  }
  return color;
};

const convertStringToColor = (value: string) => {
  let result = colorMap.get(value.toLowerCase());
  if (result) return result;
  if (value.startsWith("$") && value.length === 7) {
    return `#${value[5]}${value[6]}${value[3]}${value[4]}${value[1]}${value[2]}`;
  }
  const num = Number(value);
  if (!isNaN(num)) return convertColorToString(num);
  if (value.startsWith("#") && value.length === 7) return value;
  return "#FFFFFF";
};

export { convertColorToString, convertStringToColor };
