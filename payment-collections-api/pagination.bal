// Builds the `next`/`previous` relative URIs a paginated collection GET
// returns, from the page just served and the total match count.

isolated function pageLinks(string basePath, map<string> fixedParams, int offset, int 'limit, int count)
        returns [string?, string?] {
    string? next = ();
    string? previous = ();
    if offset + 'limit < count {
        next = buildPageUri(basePath, fixedParams, offset + 'limit, 'limit);
    }
    if offset > 0 {
        int prevOffset = offset - 'limit;
        if prevOffset < 0 {
            prevOffset = 0;
        }
        previous = buildPageUri(basePath, fixedParams, prevOffset, 'limit);
    }
    return [next, previous];
}

isolated function buildPageUri(string basePath, map<string> fixedParams, int offset, int 'limit) returns string {
    string query = string `limit=${'limit}&offset=${offset}`;
    foreach string key in fixedParams.keys() {
        string value = fixedParams.get(key);
        query = query + "&" + key + "=" + value;
    }
    return basePath + "?" + query;
}
