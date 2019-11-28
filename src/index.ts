import { Mask } from "./mask";

document.getElementById("app").innerHTML = `
<h1>Hello Mask!</h1>
<div>
  Look <a href="https://parceljs.org" target="_blank" rel="noopener noreferrer">here</a>
  for more info about Parcel.
</div>
`;

var inputEl = document.getElementById("test") as HTMLInputElement;
var mask = new Mask(inputEl, "+1 (200) 000-0000");
