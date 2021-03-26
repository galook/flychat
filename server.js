const express = require("express");
const cors = require("cors");
const fs = require("fs");
const fileUpload = require("express-fileupload");

const app = express();

app.use(cors());
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('uploads'))


const genDate = () => {
  a = new Date().toLocaleTimeString().split(":");
  a[2] = a[2].slice(3);
  return `${a[0]}:${a[1]} ${a[2]}`;
};
const defaultMessage = {
  seat: "Server",
  nick: "Quvia",
  date: genDate(),
  content: "System has started",
};

const get = () => {
  try {
    const a = fs.readFileSync("./mess.json");
    return JSON.parse(a);
  } catch (e) {
    fs.writeFileSync("./mess.json", JSON.stringify([defaultMessage]));
    return get();
  }
};
let messages = get();
const update = () => {
  try {
    fs.writeFileSync("./mess.json", JSON.stringify(messages));
  } catch (e) {
    throw e;
  }
};
const mainHTML = fs.readFileSync("./main.html").toString();
const checkSum = (s) =>
  s
    .split("")
    .reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0)
    .toString(36);

app.get("/test", (req, res) => {
  res.send(new Date().toLocaleString());
});
app.get("/renew", (req, res) => {
  fs.writeFileSync("./mess.json", JSON.stringify([defaultMessage]));
  fs.rmdirSync('./uploads', { recursive: true })
  fs.mkdirSync('./uploads')

  res.redirect("/");
  messages = get();
});
app.get("/", (req, res) => {
  let relevantMessages =
    req.query.h || messages.length < 11
      ? messages
      : messages.slice(messages.length - 11);

  res.send(
    mainHTML
      .replace(
        "{{ CHAT }}",
        relevantMessages
          .map((message) => {
            return `${message.date} | <b> ${
              message.seat ? message.seat : "anonymous"
            } <i> </b> ${
              message.nick ? "~ " + message.nick : ""
            }</i>:  <span class="messageContent"> ${
              message.content ? message.content : ""
            } </span> ${message.file ? `<br> <a href="${message.file}"><img src="${message.file}" class="msgImg"/></a>` : ``}`;
          })
          .join("<br>")
      )
      .replace("{{ checkSum }}", checkSum(JSON.stringify(messages)))
  );
});

app.post("/set", (req, res) => {
  const nMess = {
    seat: req.body.seat,
    nick: req.body.nick,
    date: genDate(),
    content: req.body.message,
    file: null
  };
  if (req.files) {
    console.log(req.files);
    let dnw = Date.now()
    req.files.img.mv(`./uploads/${dnw}.jpg`);
    nMess.file = `/${dnw}.jpg`
  }     
  console.log(nMess)
  messages.push(nMess);

  res.send(`
  <script>
    localStorage.setItem('nick', '${req.body.nick}')
    localStorage.setItem('seat', '${req.body.seat}')
    localStorage.setItem('message', '')
    window.location.href = "/"
    </script>
  `);

  update();
  return;
});
app.get("/checkMessages", (req, res) => {
  if (req.query.checksum === checkSum(JSON.stringify(messages))) res.send("OK");
  else res.send("KO");
});
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.send(`
    <script>
        window.location.reload()
    </script>`);
  throw err;
});
app.listen(9092, () => console.log("Running"));
