

const userClickedPost = async (resolve, root, args, context, info) => {
  if (args.id) {
    console.log('post clicked--', args.id)
  }
  return resolve(root, args, context, info)
}

export default {
  Query: {
    Post: userClickedPost,
  },
}
