export const apiCall = async (url, method, body) => {
    const response = method === "GET" || method === "DELETE"
        ? await fetch(url, { method })
        : await fetch(url, { method, body: body ? JSON.stringify(body) : null, headers: { "Content-Type": "application/json" } });
    if (response.status === 204) return "OK";
    if (response.status !== 200) throw Error(await response.text())

    return await response.json();
}

let time = null;
export const delay = (fn, ms) => {
    clearTimeout(time);
    time = setTimeout(() => fn(), ms);
}