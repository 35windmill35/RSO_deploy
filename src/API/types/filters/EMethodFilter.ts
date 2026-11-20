export enum EMethodFilter {
  like = "like ?",
  notLike = "not (like ? )",
  equal = "= ?",
  unequal = "<> ?",
  more = "> ?",
  less = "< ?",
  moreEq = ">= ?",
  lessEq = "<= ?",
  isNull = "is null",
  isNotnull = "is not null",
}
