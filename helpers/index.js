// Helper Helpers
function capitalize(s){
    return s[0].toUpperCase() + s.slice(1);
}
function singular(s) {
    if (s[s.length - 1] === 's')
        return s.slice(0, -1);
    return s;
}

module.exports = { capitalize, singular };


