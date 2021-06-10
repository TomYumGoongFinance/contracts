const { configChecker } = require("./libs/config")

async function validate() {
  await configChecker()
}

validate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
