import { json, redirect, TypedResponse } from "@remix-run/node";
import { checkIfChainExists } from "~/db.server";
import { promises as fs, createWriteStream, existsSync } from "fs";
import path from "path";
import Stream from "stream"
import { ActionFunctionArgs } from "~/loaderContextType";

const validFileExtensions = ["jpeg", "jpg", "gif", "png", "webp", "jfif"];

const makeDirectory = async (directory: string) => {
  if (!existsSync(directory))
    await fs.mkdir(directory, { recursive: true })
}

const deleteImage = async (directory: string, id: string) => {
  const files = await fs.readdir(directory);
  const file = files.find((f) => path.parse(f).name == id);
  if (!file) return;
  await fs.unlink(path.join(directory, file));
}

const validateId = (s: string) => /^[a-zA-Z0-9_-]*$/.test(s);

export async function action({
  request,
  context
}: ActionFunctionArgs): Promise<TypedResponse<{
  success?: string,
  error?: string;
}>> {
  const body = await request.formData();
  let file = body.get('imageFile');
  let chainId = body.get('chainId');
  let altFormId = body.get('altFormId');

  if (typeof file == "string" || file === null || typeof chainId !== "string" || typeof altFormId !== "string") {
    return json({ error: "Invalid request. Please refresh the page and try again." });
  }

  if (!checkIfChainExists(chainId))
    return json({ error: "Chain not found." });

  if (!validateId(chainId) || !validateId(altFormId))
    return json({ error: "Invalid request. Please refresh the page and try again." });

  try {
    await makeDirectory(context.tempImagesPath);
    await deleteImage(context.tempImagesPath, String(altFormId));
    let fileExtension = file.name.split(".").pop()!.toLowerCase();
    if (!validFileExtensions.includes(fileExtension))
      return json({ error: `Invalid file extension. Supported extensions are .jpg, .jpeg, .jfif, .gif, .png, and .webp.` });
    let ws = Stream.Writable.toWeb(createWriteStream(path.join(context.tempImagesPath, `${String(altFormId)}.${fileExtension}`)));
    await file.stream().pipeTo(ws);
    return json({ success: "Image Successfully Saved!", error: undefined });
  } catch (error) {
    console.log(error);
    return json({ error: "Image Not Successfully Saved!" });
  }

}