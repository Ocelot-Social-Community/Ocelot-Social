# normalize-locales.jq
#
# creates a copy of the structure of source and replaces the values
# by the corresponding value of target. If the key does not exist in target,
# the value is set to null.
#
# jq -n --argfile source en.json --argfile target es.json -f normalize-locales.jq 
#
# source should be primary or fallback locale file (here en.json)
# taget is the locale file to normalize (here es.json)

def find_key_by_path($path):
  if $path | length == 0
    then .
    elif .[$path[0]]
      then .[$path[0]] | find_key_by_path($path[1:])
    else null
  end;

def keys_to_paths_recursive($path):
  if type == "object"
    then with_entries(
      ($path +  [.key]) as $path  |
      if (.value | type == "string")
        then .value |= ($target | find_key_by_path($path))
        else .value |= keys_to_paths_recursive($path)
      end)
    else .
  end;

$source | keys_to_paths_recursive([])
