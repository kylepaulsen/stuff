function redistributeChances(chanceObj, prop, change) {
    const allProps = Object.keys(chanceObj);
    allProps.sort(function(a, b) {
        if (change < 0) {
            return chanceObj[a] - chanceObj[b]
        } else {
            return chanceObj[b] - chanceObj[a]
        }
    });
    const changeProp = function(prop, change) {
        const currentVal = chanceObj[prop];
        let newVal = currentVal + change;
        let delta = change;
        if (newVal < 0) {
            delta = -currentVal;
            newVal = 0;
        } else if (newVal > 1) {
            newVal = 1;
            delta = 1 - currentVal;
        }
        chanceObj[prop] = newVal;
        return delta;
    };

    const mainDelta = changeProp(prop, change);

    if (allProps.length > 1) {
        let distributeAmount = -mainDelta / (allProps.length - 1);
        let x = allProps.length;
        let propsLeft = x - 2;
        while (x--) {
            let nextProp = allProps[x];
            if (nextProp !== prop) {
                let propDelta = changeProp(nextProp, distributeAmount);
                if (distributeAmount < 0 && propDelta > distributeAmount) {
                    distributeAmount -= (propDelta - distributeAmount) / propsLeft;
                } else if (distributeAmount > 0 && propDelta < distributeAmount) {
                    distributeAmount += (distributeAmount - propDelta) / propsLeft;
                }
                propsLeft--;
            }
        }
    }
}
