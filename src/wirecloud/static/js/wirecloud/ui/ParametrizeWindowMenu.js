function ParametrizeWindowMenu(inputInterface) {
    var fields, sourceOptions, statusOptions;

    statusOptions = [
        {label: gettext('Normal'), value: 'normal'},
        {label: gettext('Read Only'), value: 'readonly'}
    ];

    if (inputInterface.canBeHidden) {
        statusOptions.push({label: gettext('Hidden'), value: 'hidden'});
    }

    sourceOptions = [
        {label: gettext('Current value'), value: 'current'},
        {label: gettext('Default value'), value: 'default'},
        {label: gettext('Parametrized value'), value: 'custom'}
    ];

    fields = {
        'status': {label: gettext('Status'), type: 'select', initialEntries: statusOptions, required: true},
        'source': {label: gettext('Value source'), type: 'select', initialEntries: sourceOptions, required: true},
        'separator': {type: 'separator'},
        'value': {label: gettext('Value'), type: 'parametrizedText', variable: inputInterface.variable}
    }
    FormWindowMenu.call(this, fields, gettext('Parametrization'), 'variable_parametrization');

    this.inputInterface = inputInterface;

    // TODO
    var valueInput = this.form.fieldInterfaces['value'];
    var sourceInput = this.form.fieldInterfaces['source'].inputElement;
    var updateFunc = function() {
        this.valueInput.setDisabled(this.sourceInput.getValue() !== 'custom');
    }.bind({valueInput: valueInput, sourceInput: sourceInput});
    valueInput.update = updateFunc;
    Event.observe(sourceInput.inputElement, 'change', updateFunc);
}
ParametrizeWindowMenu.prototype = new FormWindowMenu();

ParametrizeWindowMenu.prototype.executeOperation = function(newValue) {
    this.inputInterface.setValue(newValue);
};
