describe('Amount', () => {
  let $compile;
  let $rootScope;
  let element;
  let isoScope;

  beforeEach(module('walletApp'));

  beforeEach(inject(function (_$compile_, _$rootScope_, Wallet) {

    $compile = _$compile_;
    $rootScope = _$rootScope_;

  })
  );

  beforeEach(function () {
    element = $compile("<fiat-or-btc></fiat-or-btc>")($rootScope);
    $rootScope.$digest();
    isoScope = element.isolateScope();
    return isoScope.$digest();
  });

  it('should not show Fiat if BTC is set as display currency', inject(function (Wallet) {
    Wallet.settings.displayCurrency = {code: "BTC"};
    isoScope.updateDisplay();
    expect(isoScope.isBitCurrency(isoScope.currency)).toBe(true);
  })
  );

  it('should show Fiat if BTC is not set as display currency', inject(function (Wallet) {
    Wallet.settings.displayCurrency = {code: "USD"};
    isoScope.updateDisplay();
    expect(isoScope.isBitCurrency(isoScope.currency)).toBe(false);
  })
  );
});
