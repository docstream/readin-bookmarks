mongoose = require 'mongoose'
Schema = require('mongoose').Schema
_ = require 'underscore'

bookmarkSchema = Schema({
  domainName: {type: String, required: true}
  endUser: {type: Schema.Types.ObjectId, required: true}
  urlFragFree: {type: String, required: true}
  urlFrag: String
  title: {type: String, required: true}
  created: {type: Date, default: Date.now}
})

uniqueIndex = { urlFragFree:1, urlFrag:1 ,domainName:1, endUser:1 }
bookmarkSchema.index uniqueIndex, { unique:true }

bookmarkSchema.set('toObject', { virtuals: true });

bookmarkSchema.virtual('encURI').get ->
  encURI = encodeURIComponent "#{@urlFragFree}##{@urlFrag}"
  encURI

# @deprecated
bookmarkSchema.virtual('ebookId').get ->
  split = @urlFragFree.split('/')
  if split.length >= 3
    split[2]
  else
    ""

bookmarkSchema.virtual('formatedCreatedDate').get ->
  date = new Date @created
  m = (date.getMonth()+1)
  month = if m < 10 then "0#{m}" else m

  d = date.getDate()
  day = if d < 10 then "0#{d}" else d

  "#{day}-#{month}-#{date.getFullYear()}"

bookmarkSchema.statics.create = (data, cb) ->
  bookmark = new Bookmark(data)
  bookmark.save (err) ->
    if err
      cb err
    else
      cb null, bookmark

bookmarkSchema.statics.findSingle = (params, cb) ->
  query = {
    endUser: params.endUser
    _id: params._id
  }

  @.findOne(query, cb)

bookmarkSchema.statics.overview = (params, cb) ->
  query = {
    endUser: params.endUser
    domainName: params.domainName
    urlFragFree: params.urlFragFree
  }

  try
    aggregateQuery = [
      { $match:
        {
          endUser: mongoose.Types.ObjectId(params.endUser)
          domainName: params.domainName
          urlFragFree: params.urlFragFree
        }
      },
      { $group:
        {
          _id: "$urlFrag",
          count: {$sum: 1}
        }
      }
    ]

    @.aggregate aggregateQuery, cb
  catch error
    cb error

bookmarkSchema.statics.search = (params, query, cb) ->
  dbQuery = {
    endUser: params.endUser
    domainName: params.domainName
  }

  if query.urlFragFree
    dbQuery.urlFragFree = query.urlFragFree
  if query.urlFrag
    dbQuery.urlFrag = query.urlFrag

  if query.page
    absoluteMax = 50
    pageSize = if query.max then query.max else 10
    if pageSize > absoluteMax
      pageSize = absoluteMax
    page = query.page - 1

    @.where(dbQuery).count (err, count) =>
      if err
        cb err
      else if count == 0
        cb null, []
      else
        @.find(dbQuery)
          .skip(pageSize * page)
          .limit(pageSize)
          .sort({created: -1})
          .exec (err, bookmarks) ->
            if err
              cb err
            else
              cb null, {totalCount: count, page: query.page, pageSize: pageSize, bookmarks: bookmarks}
  else
    @.find(dbQuery).sort({created: -1}).exec(cb)

Bookmark = null
module.exports = (conn) ->
  Bookmark = conn.model 'Bookmark', bookmarkSchema
  return Bookmark
