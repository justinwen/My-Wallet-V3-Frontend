angular
  .module('walletApp')
  .controller('CoinifyBankAccountController', CoinifyBankAccountController);

function CoinifyBankAccountController ($scope, $q, $timeout, Wallet, buySell, currency, Alerts) {
  $scope.$parent.limits = {};
  $scope.exchange = buySell.getExchange();
  $scope.toggleEditAmount = () => $scope.$parent.editAmount = !$scope.$parent.editAmount;
  $scope.isBankTransfer = () => $scope.isMedium('bank');
  $scope.qa = {};
  $scope.accountCurrency = $scope.$parent.bankAccount.account.currency;
  $scope.accountType = 'international';
  $scope.showBankName = true;

  $scope.setAccountType = (accountType) => {
    $scope.accountType = accountType;
  };

  $scope.selectCountry = (country) => {
    $scope.$parent.bankAccount.holder.address.country = country.code;
  };

  $scope.selectBankCountry = (country) => {
    $scope.$parent.bankAccount.bank.address.country = country.code;
    $scope.selectedBankCountry = country.name;
  };

  $scope.getMaxMin = (curr) => {
    const calculateMin = (rate) => {
      $scope.$parent.limits.min = (rate * 10).toFixed(2);
    };

    const calculateMax = (rate) => {
      $scope.$parent.limits.max = buySell.calculateMax(rate, $scope.medium).max;
      $scope.$parent.limits.available = buySell.calculateMax(rate, $scope.medium).available;
    };

    return buySell.fetchProfile(true).then(() => {
      let min = buySell.getRate('EUR', curr.code).then(calculateMin);
      let max = buySell.getRate($scope.exchange.profile.defaultCurrency, curr.code).then(calculateMax);
      return $q.all([min, max]).then($scope.setParentError);
    });
  };

  $scope.setAccountType = (tx) => {
    if (tx.currency === 'DKK') {
      $scope.showDanish = true;
      $scope.showBankName = false;
      $scope.$parent.bankAccount.holder.address.country = 'DK';
      $scope.$parent.bankAccount.bank.address.country = 'DK';
    }
    if (tx.currency === 'EUR') {
      $scope.showBankName = false;
    }
    if (tx.currency === 'GBP') {
      $scope.britishBank = true;
      $scope.$parent.bankAccount.holder.address.country = 'GB';
      $scope.$parent.bankAccount.bank.address.country = 'GB';
    }
  };
  $scope.setAccountType($scope.transaction);

  $scope.commitValues = () => {
    $scope.$parent.quote = null;
    $scope.status.waiting = true;
    $scope.transaction.currency = $scope.tempCurrency;
    $scope.transaction.fiat = $scope.tempFiat;
    $scope.getQuote().then(() => $scope.status.waiting = false);
    $scope.$parent.changeCurrencySymbol($scope.transaction.currency);
    $scope.toggleEditAmount();
  };

  $scope.cancel = () => {
    $scope.tempCurrency = $scope.transaction.currency;
    $scope.tempFiat = $scope.transaction.fiat;
    $scope.$parent.fiatFormInvalid = false;
    $scope.toggleEditAmount();
  };

  $scope.changeTempCurrency = (curr) => (
    $scope.getMaxMin(curr).then(() => { $scope.tempCurrency = curr; })
  );

  $scope.qa.ukInfo = () => {
    $scope.$parent.bankAccount = {
      account: {
        bic: 'NWBK',
        number: 'GB29 NWBK 6016 1331 9268 19',
        currency: $scope.trade.quoteCurrency
      },
      bank: {
        name: 'Gringotts',
        address: {
          street: '1 Tea St',
          city: 'London',
          state: null,
          zipcode: '11111',
          country: 'GB'
        }
      },
      holder: {
        name: 'Harry Potter',
        address: {
          street: '4 Privet Drive',
          zipcode: '22222',
          city: 'London',
          state: '',
          country: 'GB'
        }
      }
    }
  };

  $scope.qa.dkInfo = () => {
    $scope.$parent.bankAccount = {
      account: {
        bic: '0040',
        number: '0040 0440 1162 43',
        currency: $scope.trade.quoteCurrency
      },
      bank: {
        address: {
          country: 'DK'
        }
      },
      holder: {
        name: 'Viggo Mortensen',
        address: {
          street: '1 Danish Way',
          zipcode: '22222',
          city: 'Copenhagen',
          state: '',
          country: 'DK'
        }
      }
    }
  };

  $scope.qa.sepaInfo = () => {
    $scope.$parent.bankAccount = {
      account: {
        bic: '37040044',
        number: 'DE89 3704 0044 0532 0130 00',
        currency: $scope.trade.quoteCurrency
      },
      bank: {
        address: {
          country: 'DE'
        }
      },
      holder: {
        name: 'Ludwig van Beethoven',
        address: {
          street: '1 Germany Way',
          zipcode: '22222',
          city: 'Berlin',
          state: '',
          country: 'DE'
        }
      }
    }
  };

  $scope.setAccountCurrency = (currency) => {
    $scope.$parent.bankAccount.account.currency = currency.code;
    $scope.accountCurrency = currency.code;
  };

  let eventualError = (message) => Promise.reject.bind(Promise, { message });

  $scope.$parent.buy = () => {
    $scope.status.waiting = true;

    let success = (trade) => {
      $scope.$parent.trade = trade;
      Alerts.clear($scope.alerts);
      if ($scope.$parent.trade.bankAccount) $scope.formatTrade('bank_transfer');

      $scope.nextStep();
    };

    // check if bank transfer and kyc level
    if ($scope.needsKyc()) {
      return buySell.kycs.length && ['declined', 'rejected', 'expired'].indexOf(buySell.kycs[0].state) > -1
        ? buySell.triggerKYC().then(success, $scope.standardError)
        : buySell.getOpenKYC().then(success, $scope.standardError);
    }

    let buyError = eventualError('ERROR_TRADE_CREATE');

    $scope.accounts[0].buy()
                      .catch(buyError)
                      .then(success, $scope.standardError)
                      .then($scope.watchAddress);
  };

  $scope.$watch('transaction.currency', (newVal, oldVal) => {
    $scope.tempCurrency = $scope.transaction.currency;
  });

  $scope.$watch('transaction.fiat', (newVal, oldVal) => {
    $scope.tempFiat = $scope.transaction.fiat;
  });

  $scope.$watch('rateForm', () => {
    $scope.$parent.rateForm = $scope.rateForm;
  });

  $scope.$watch('step', () => {
    if ($scope.onStep('summary')) {
      $scope.getMaxMin($scope.tempCurrency);

      // Get a new quote if using a fake quote.
      if (!$scope.$parent.quote.id) {
        $scope.$parent.quote = null;
        $scope.getQuote();
      }
    }
  });
}