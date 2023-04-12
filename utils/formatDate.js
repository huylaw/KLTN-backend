const formatDate = (date) => {
    const timestamp = new Date(date).getTime();
    const day = new Date(timestamp).getDate();
    const month = new Date(timestamp).getMonth() + 1;
    const year = new Date(timestamp).getFullYear();

    const date_format = `${year}-${month}-${day}`  
    return date_format;
}

module.exports = formatDate;