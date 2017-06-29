function monthDiff (begin, end) {
    var months = (end.getFullYear() - begin.getFullYear()) * 12;
    var endMonth = end.getMonth();
    var endDate = end.getDate();
    var beginMonth = begin.getMonth();
    var beginDate = begin.getDate();
    if(endMonth === beginMonth) {
        if(beginDate > endDate) {
        months--;
        }
    } else {
        if(endMonth < beginMonth) {
            months -= beginMonth - endMonth;
        } else if(endMonth > beginMonth) {                    
            months += endMonth - beginMonth;
            if(endDate < beginDate) {
                months--;
            }
        }
    }
    return months;
};
